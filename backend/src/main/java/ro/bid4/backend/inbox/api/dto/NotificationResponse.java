package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    String type,
    Map<String, String> payload,
    String deepLink,
    boolean read,
    Instant createdAt) {}
