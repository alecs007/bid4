package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.inbox.domain.ConversationKind;
import ro.bid4.backend.inbox.domain.ParticipantRole;

/**
 * One row of the inbox list.
 *
 * <p>Carries the other party rather than both, because the reader is always one of them and a list
 * that made them work out which name is theirs would be a list nobody scans.
 *
 * <p>{@code orderId} is what turns a row from a question into a sale. It is null through all of
 * phase one.
 *
 * <p>{@code viewerRole} says which side of this particular listing the reader is on. The same two
 * people can be buyer in one thread and seller in the next, so it is a fact about the conversation
 * rather than about either of them — and every step of a sale reads differently depending on it.
 */
public record ConversationSummary(
    UUID id,
    ConversationKind kind,
    UUID listingId,
    String listingTitle,
    String listingImageUrl,
    long listingPrice,
    PublicUserResponse otherParty,
    ParticipantRole viewerRole,
    UUID orderId,
    ThreadItemResponse lastItem,
    int unreadCount,
    boolean archived,
    boolean muted,
    Instant lastItemAt) {}
