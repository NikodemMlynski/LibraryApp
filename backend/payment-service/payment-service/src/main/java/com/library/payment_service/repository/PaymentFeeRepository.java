package com.library.payment_service.repository;

import com.library.payment_service.model.PaymentFee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface PaymentFeeRepository extends JpaRepository<PaymentFee, Long> {
    Optional<PaymentFee> findByStripePaymentIntentId(String intentId);

    List<PaymentFee> findByStatusOrderByPaidAtDesc(String status);

    List<PaymentFee> findByUserIdAndStatusOrderByPaidAtDesc(String userId, String status);
}
