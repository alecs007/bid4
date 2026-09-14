package ro.bid4.backend.inbox.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.inbox.domain.ConversationKind;
import ro.bid4.backend.inbox.domain.ParticipantRole;

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
