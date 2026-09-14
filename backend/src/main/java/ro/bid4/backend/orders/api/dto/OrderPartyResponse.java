package ro.bid4.backend.orders.api.dto;

import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;

public record OrderPartyResponse(
    UUID id,
    String displayName,
    String username,
    String avatarUrl,
    AccountType accountType,
    boolean verified) {}
