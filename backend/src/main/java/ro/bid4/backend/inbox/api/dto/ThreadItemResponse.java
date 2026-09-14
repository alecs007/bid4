package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import ro.bid4.backend.inbox.domain.ThreadItemKind;

public record ThreadItemResponse(
    UUID id,
    ThreadItemKind kind,
    UUID senderId,
    boolean mine,
    String body,
    List<String> imageUrls,
    String eventType,
    String orderStatus,
    Map<String, String> payload,
    String flaggedReason,
    Instant createdAt) {}
