package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PlaceBidRequest(
    @NotNull(message = "Introdu suma pe care vrei să o oferi.")
        @Min(value = 100, message = "Oferta este prea mică.")
        @Max(value = 100_000_000L, message = "Oferta depășește maximul acceptat.")
        Long amount,
    String acceptedTermsVersion) {}
