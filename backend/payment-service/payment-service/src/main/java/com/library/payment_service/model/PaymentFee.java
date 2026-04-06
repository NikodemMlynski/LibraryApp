package com.library.payment_service.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "payment_fees")
@Data
public class PaymentFee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long loanId; // Powiązanie z ID z Lending Service

    @Column(nullable = false)
    private String userId; // UUID z Keycloaka

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, PAID, FAILED

    @Column
    private String userName;

    @Column
    private String bookTitle;

    @Column
    private java.time.LocalDateTime paidAt;

    @Column(unique = true)
    private String stripePaymentIntentId;
} // OGARNĄĆ FRONTEND DOCKERFILE Z TYM CO JEST NA GEMINI