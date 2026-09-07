package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * One notification.
 *
 * <p>A type and the handful of values its sentence needs, not a finished sentence. The Romanian
 * copy lives in the frontend, where it can be changed without a migration rewriting what people
 * were told last month.
 */
public record NotificationResponse(
    UUID id,
    String type,
    Map<String, String> payload,
    String deepLink,
    boolean read,
    Instant createdAt) {}
