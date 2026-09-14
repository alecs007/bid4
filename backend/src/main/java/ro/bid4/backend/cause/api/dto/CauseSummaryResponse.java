package ro.bid4.backend.cause.api.dto;

import java.util.UUID;
import ro.bid4.backend.cause.domain.CauseStatus;

public record CauseSummaryResponse(
    UUID id,
    String name,
    String slug,
    String shortDescription,
    String imageUrl,
    String category,
    long goalAmount,
    long raisedAmount,
    CauseStatus status) {}
