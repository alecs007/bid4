package ro.bid4.backend.billing.api.dto;

import java.time.Instant;

public record DocumentResponse(
    String kind,
    String number,
    String issuedToName,
    long amount,
    boolean available,
    Instant issuedAt) {}
