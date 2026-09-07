package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import ro.bid4.backend.inbox.domain.ThreadItemKind;

/**
 * One line of a thread, as the reader sees it.
 *
 * <p>{@code eventType}, {@code orderStatus} and {@code payload} are a record of a step, never an
 * instruction. Nothing here says what may be done next: the client works that out from the order's
 * current status, and pressing anything calls the order endpoint, which decides for itself. An item
 * that arrives with the wrong payload can show the wrong words and cannot produce a working button.
 *
 * <p>{@code mine} rather than comparing ids in the client — the answer is the same on every screen
 * and the server already knows who is asking.
 */
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
