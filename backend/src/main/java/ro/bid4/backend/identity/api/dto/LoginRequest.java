package ro.bid4.backend.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank(message = "Introdu adresa de email.")
        @Email(message = "Adresa de email nu pare validă.")
        @Size(max = 254, message = "Adresa de email este prea lungă.")
        String email,
    // Only presence is checked. A length rule here would tell an attacker how
    // long the stored password is not.
    @NotBlank(message = "Introdu parola.") @Size(max = 200) String password) {}
