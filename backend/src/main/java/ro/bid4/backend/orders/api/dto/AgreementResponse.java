package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import ro.bid4.backend.orders.domain.AgreementKind;

public record AgreementResponse(AgreementKind kind, String termsVersion, Instant acceptedAt) {}
