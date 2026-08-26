package ro.bid4.backend.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResendVerificationRequest(
    @NotBlank(message = "Introdu adresa de email.")
        @Email(message = "Adresa de email nu pare validă.")
        @Size(max = 254)
        String email) {}
