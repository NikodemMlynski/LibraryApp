package com.library.payment_service.controller;

import com.library.payment_service.service.StripeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripeService stripeService;

    // Klasa pomocnicza dla requestu
    @Data
    static class PaymentRequest {
        private Long loanId;
        private BigDecimal amount;
        private String userName;
        private String bookTitle;
    }

    @GetMapping("/admin/transactions")
    public ResponseEntity<?> getTransactions(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !((java.util.List<String>) realmAccess.get("roles")).contains("admin")) {
            return ResponseEntity.status(403).body("Access Denied: Requires admin role");
        }
        return ResponseEntity.ok(stripeService.getAllPaidTransactions());
    }

    @PostMapping("/create-intent")
    public ResponseEntity<?> createPaymentIntent(
            @RequestBody PaymentRequest request,
            @AuthenticationPrincipal Jwt jwt // Wyciąga dane usera z tokenu
    ) {
        try {
            // "sub" w tokenie to UUID usera z Keycloaka
            String userId = jwt.getClaimAsString("sub");
            String clientSecret = stripeService.createPaymentIntent(
                    request.getLoanId(),
                    userId,
                    request.getAmount(),
                    request.getUserName(),
                    request.getBookTitle());

            return ResponseEntity.ok(Map.of("clientSecret", clientSecret));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ZWRÓĆ UWAGĘ: Zwracamy po prostu 200 OK. Stripe musi wiedzieć, że dostaliśmy
    // sygnał.
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleStripeWebhook(
            @RequestBody String payload, // Stripe wysyła surowy JSON
            @RequestHeader("Stripe-Signature") String sigHeader // Podpis
    ) {
        stripeService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my-transactions")
    public ResponseEntity<?> getMyTransactions(@AuthenticationPrincipal Jwt jwt) {
        // "sub" to UUID zalogowanego czytelnika z Keycloaka
        String userId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(stripeService.getUserPaidTransactions(userId));
    }
}