package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.ItemCondition;

/**
 * The CreateAuctionPayload type in frontend/src/lib/types/auction.ts.
 *
 * <p>The seller is not a field. It comes from the token, so a listing cannot be created in somebody
 * else's name by editing the body — the same reason a bid carries only its amount.
 *
 * <p>Bounds here are shape: what a single field may hold on its own. Anything that needs another
 * field or a lookup — that the cause is approved, that the reserve sits above the starting price,
 * that the window is a sane length — lives in ListingService, where the refusal can say why.
 */
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
    @Min(value = 100, message = "Pasul de licitare este prea mic.") long bidIncrement,
    Long reservePrice,
    Long buyNowPrice,
    @NotNull(message = "Alege când începe licitația.") Instant startTime,
    @NotNull(message = "Alege când se încheie licitația.") Instant endTime,
    @Min(value = 30, message = "Prelungirea automată este între 30 și 600 de secunde.")
        @Max(value = 600, message = "Prelungirea automată este între 30 și 600 de secunde.")
        int antiSnipeSeconds) {}
