package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AcceptOfferRequest(
    @NotNull(message = "Alege oferta pe care o accepți.") UUID bidId) {}
