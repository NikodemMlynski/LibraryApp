package com.library.payment_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.*;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.keycloak.internal-url}")
    private String keycloakInternalUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Wyłączamy CSRF dla API
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/payments/webhook").permitAll() // PUBLICZNE!
                        .anyRequest().authenticated() // Reszta chroniona JWT
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder())));

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // 1. Skąd pobrać publiczne klucze (Z sieci wewnętrznej Dockera - zawsze
        // niezmienne)
        String jwkSetUri = keycloakInternalUrl + "/realms/library-system/protocol/openid-connect/certs";
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

        // 2. Customowy walidator Issuera (przepuszcza localhost, adresy IP z apki
        // mobilnej oraz domenę PROD)
        OAuth2TokenValidator<Jwt> flexibleIssuerValidator = token -> {
            if (token.getIssuer() != null && token.getIssuer().toString().endsWith("/realms/library-system")) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid issuer", null));
        };

        // 3. Połączenie walidatorów (czas wygaśnięcia + nasza elastyczna zgodność
        // wydawcy)
        OAuth2TokenValidator<Jwt> withTimestamp = new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                flexibleIssuerValidator);

        jwtDecoder.setJwtValidator(withTimestamp);
        return jwtDecoder;
    }
}