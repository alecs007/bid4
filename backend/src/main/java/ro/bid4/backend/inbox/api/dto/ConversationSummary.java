package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.inbox.domain.ConversationKind;

/**
 * One row of the inbox list.
 *
 * <p>Carries the other party rather than both, because the reader is always one of them and a list
 * that made them work out which name is theirs would be a list nobody scans.
 *
 * <p>{@code orderId} is what turns a row from a question into a sale. It is null through all of
 * phase one.
 */
public record ConversationSummary(
    UUID id,
    ConversationKind kind,
    UUID listingId,
    String listingTitle,
    String listingImageUrl,
    long listingPrice,
    PublicUserResponse otherParty,
    UUID orderId,
    ThreadItemResponse lastItem,
    int unreadCount,
    boolean archived,
    boolean muted,
    Instant lastItemAt) {}
