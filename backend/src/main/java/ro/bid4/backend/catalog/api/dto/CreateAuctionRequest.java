package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.ItemCondition;

public record CreateAuctionRequest(
    @NotBlank(message = "Adaugă un titlu.")
        @Size(min = 8, max = 120, message = "Titlul are între 8 și 120 de caractere.")
        String title,
    @NotBlank(message = "Adaugă o descriere.")
        @Size(min = 20, max = 4000, message = "Descrierea are între 20 și 4000 de caractere.")
        String description,
    @NotEmpty(message = "Adaugă cel puțin o fotografie.")
        @Size(max = 8, message = "Poți adăuga cel mult 8 fotografii.")
        List<@NotBlank @Size(max = 8192) String> images,
    @NotBlank(message = "Alege o categorie.") String category,
    @NotNull(message = "Alege starea obiectului.") ItemCondition condition,
    @Min(value = 1, message = "Greutatea trebuie să fie cel puțin 1 gram.")
        @Max(value = 15000, message = "Greutatea depășește maximul acceptat de 15 kg.")
        int weightGrams,
    @NotNull(message = "Alege cauza pe care o susții.") UUID causeId,
    @Min(value = 5, message = "Procentul donat este între 5 și 100.")
        @Max(value = 100, message = "Procentul donat este între 5 și 100.")
        int donationPercent,
    @Min(value = 100, message = "Prețul de pornire este prea mic.")
        @Max(value = 10_000_000L, message = "Prețul de pornire depășește maximul acceptat.")
        long startingPrice,
    Long reservePrice,
    Long buyNowPrice) {}
