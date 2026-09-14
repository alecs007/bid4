package ro.bid4.backend.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ro.bid4.backend.identity.domain.AccountType;

public record RegisterRequest(
    @NotBlank(message = "Introdu adresa de email.")
        @Email(message = "Adresa de email nu pare validă.")
        @Size(max = 254, message = "Adresa de email este prea lungă.")
        String email,
    @NotBlank(message = "Introdu o parolă.")
        @Size(min = 8, max = 200, message = "Parola are nevoie de cel puțin 8 caractere.")
        String password,
    @NotBlank(message = "Completează numele afișat.")
        @Size(min = 2, max = 60, message = "Numele afișat are între 2 și 60 de caractere.")
        String displayName,
    @NotNull(message = "Alege tipul de cont.") AccountType accountType,
    @Size(max = 160, message = "Denumirea legală este prea lungă.") String orgLegalName,
    @Size(max = 32, message = "Codul de înregistrare este prea lung.") String orgRegistrationNumber,
    boolean acceptedTerms) {}
