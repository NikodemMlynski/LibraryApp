package com.library.payment_service.service;

import com.library.payment_service.model.PaymentFee;
import com.library.payment_service.repository.PaymentFeeRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class StripeService {

    private final PaymentFeeRepository paymentRepository;

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    public String createPaymentIntent(Long loanId, String userId, BigDecimal amount, String userName, String bookTitle)
            throws StripeException {
        long amountInCents = amount.multiply(new BigDecimal(100)).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("pln")
                .putMetadata("loanId", String.valueOf(loanId))
                .putMetadata("userId", userId)
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        PaymentFee fee = new PaymentFee();
        fee.setLoanId(loanId);
        fee.setUserId(userId);
        fee.setAmount(amount);
        fee.setUserName(userName);
        fee.setBookTitle(bookTitle);
        fee.setStatus("PENDING");
        fee.setStripePaymentIntentId(intent.getId());
        paymentRepository.save(fee);

        return intent.getClientSecret();
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) {
        System.out.println("Otrzymano Webhook ze Stripe!");
        try {
            // Weryfikacja kryptograficzna - czy to na pewno Stripe?
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            System.out.println("Typ eventu: " + event.getType());

            if ("payment_intent.succeeded".equals(event.getType())) {
                PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer().deserializeUnsafe();

                if (intent != null) {
                    System.out.println("Sukces płatności dla Intent ID: " + intent.getId());

                    paymentRepository.findByStripePaymentIntentId(intent.getId()).ifPresentOrElse(fee -> {
                        fee.setStatus("PAID");
                        fee.setPaidAt(java.time.LocalDateTime.now());
                        paymentRepository.save(fee);
                        System.out.println("Zaktualizowano transakcję " + fee.getId() + " na PAID w bazie danych!");
                        
                        try {
                            RestTemplate restTemplate = new RestTemplate();
                            HttpHeaders headers = new HttpHeaders();
                            headers.setContentType(MediaType.APPLICATION_JSON);
                            
                            Map<String, Object> metadata = new HashMap<>();
                            metadata.put("loan_id", fee.getLoanId());
                            metadata.put("amount", fee.getAmount());
                            metadata.put("message", "Zaksięgowano płatność za książkę: " + fee.getBookTitle());
                            
                            String actionType = fee.getAmount().compareTo(new BigDecimal("2.00")) > 0 
                                ? "PAYMENT_PENALTY_SUCCESS" : "PAYMENT_FEE_SUCCESS";
                            
                            Map<String, Object> requestBody = new HashMap<>();
                            requestBody.put("action_type", actionType);
                            requestBody.put("actor_id", fee.getUserId() != null ? fee.getUserId() : "system");
                            requestBody.put("visibility", "ADMIN");
                            requestBody.put("metadata", metadata);
                            
                            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                            restTemplate.postForLocation("http://analytics-service:8000/internal/logs", request);
                        } catch (Exception ex) {
                            System.out.println("Błąd wysyłania logu do analytics-service: " + ex.getMessage());
                        }
                        
                    }, () -> {
                        System.out.println("UWAGA: Nie znaleziono transakcji w bazie dla ID: " + intent.getId());
                    });
                }
            } else if ("payment_intent.payment_failed".equals(event.getType())) {
                PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer().deserializeUnsafe();
                if (intent != null) {
                    System.out.println("Odrzucono płatność dla Intent ID: " + intent.getId());
                    paymentRepository.findByStripePaymentIntentId(intent.getId()).ifPresent(fee -> {
                        fee.setStatus("FAILED");
                        paymentRepository.save(fee);
                        
                        try {
                            RestTemplate restTemplate = new RestTemplate();
                            HttpHeaders headers = new HttpHeaders();
                            headers.setContentType(MediaType.APPLICATION_JSON);
                            
                            Map<String, Object> metadata = new HashMap<>();
                            metadata.put("loan_id", fee.getLoanId());
                            metadata.put("amount", fee.getAmount());
                            metadata.put("message", "Odrzucono próbę wpłaty dla książki: " + fee.getBookTitle());
                            
                            Map<String, Object> requestBody = new HashMap<>();
                            requestBody.put("action_type", "PAYMENT_FAILED");
                            requestBody.put("actor_id", fee.getUserId() != null ? fee.getUserId() : "system");
                            requestBody.put("visibility", "ADMIN");
                            requestBody.put("metadata", metadata);
                            
                            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                            restTemplate.postForLocation("http://analytics-service:8000/internal/logs", request);
                        } catch (Exception ex) {
                            System.out.println("Błąd logowania porażki: " + ex.getMessage());
                        }
                    });
                }
            }
        } catch (SignatureVerificationException e) {
            System.out.println("Błąd sygnatury Webhooka!");
            throw new RuntimeException("Niewłaściwy podpis Webhooka!");
        } catch (Exception e) {
            System.out.println("Inny błąd podczas webhooka: " + e.getMessage());
        }
    }

    public java.util.List<PaymentFee> getAllPaidTransactions() {
        return paymentRepository.findByStatusOrderByPaidAtDesc("PAID");
    }

}