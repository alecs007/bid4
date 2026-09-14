package ro.bid4.backend.inbox.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;
import ro.bid4.backend.inbox.api.dto.ConversationSummary;
import ro.bid4.backend.inbox.api.dto.NotificationResponse;
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.domain.Conversation;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.Notification;
import ro.bid4.backend.inbox.domain.ThreadItem;
import ro.bid4.backend.storage.service.MediaUrls;

@Service
public class InboxMapper {
  private final AuctionRepository auctions;
  private final UserMapper users;

  public InboxMapper(AuctionRepository auctions, UserMapper users) {
    this.auctions = auctions;
    this.users = users;
  }

  public List<ThreadItemResponse> toItems(List<ThreadItem> items, UUID viewerId) {
    return items.stream().map(item -> toItem(item, viewerId)).toList();
  }

  public ThreadItemResponse toItem(ThreadItem item, UUID viewerId) {
    return new ThreadItemResponse(
        item.getId(),
        item.getKind(),
        item.getSenderId(),
        item.getSenderId() != null && item.getSenderId().equals(viewerId),
        item.getBody(),
        item.getAttachments().stream().map(MediaUrls::forFile).toList(),
        item.getEventType(),
        item.getOrderStatus(),
        item.getPayload(),
        item.getFlaggedReason(),
        item.getCreatedAt());
  }

  public List<ConversationSummary> toSummaries(
      List<Conversation> conversations,
      Map<UUID, ConversationParticipant> membership,
      Map<UUID, ThreadItem> newestItems,
      UUID viewerId) {
    Map<UUID, Auction> listings = listingsFor(conversations);
    Map<UUID, PublicUserResponse> parties =
        users.publicUsersById(
            conversations.stream()
                .map(conversation -> otherPartyId(conversation, viewerId))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList());

    return conversations.stream()
        .map(
            conversation ->
                toSummary(
                    conversation,
                    membership.get(conversation.getId()),
                    newestItems.get(conversation.getId()),
                    listings.get(conversation.getListingId()),
                    partyOrNull(parties, otherPartyId(conversation, viewerId)),
                    viewerId))
        .toList();
  }

  public ConversationSummary toSummary(
      Conversation conversation,
      ConversationParticipant membership,
      ThreadItem newestItem,
      Auction listing,
      PublicUserResponse otherParty,
      UUID viewerId) {
    return new ConversationSummary(
        conversation.getId(),
        conversation.getKind(),
        conversation.getListingId(),
        listing == null ? null : listing.getTitle(),
        listing == null || listing.getImages().isEmpty()
            ? null
            : MediaUrls.resolveAll(listing.getImages()).getFirst(),
        listing == null ? 0L : listing.getCurrentPrice(),
        otherParty,
        membership == null ? null : membership.getRole(),
        conversation.getOrderId(),
        newestItem == null ? null : toItem(newestItem, viewerId),
        membership == null ? 0 : membership.getUnreadCount(),
        membership != null && membership.isArchived(),
        membership != null && membership.isMuted(),
        conversation.getLastItemAt());
  }

  public PublicUserResponse publicUser(UUID userId) {
    return users.publicUsersById(List.of(userId)).get(userId);
  }

  public NotificationResponse toNotification(Notification notification) {
    return new NotificationResponse(
        notification.getId(),
        notification.getType(),
        notification.getPayload(),
        notification.getDeepLink(),
        notification.getReadAt() != null,
        notification.getCreatedAt());
  }

  private static PublicUserResponse partyOrNull(Map<UUID, PublicUserResponse> parties, UUID id) {
    return id == null ? null : parties.get(id);
  }

  private UUID otherPartyId(Conversation conversation, UUID viewerId) {
    if (conversation.getSellerId() == null) {
      return null;
    }
    return viewerId.equals(conversation.getBuyerId())
        ? conversation.getSellerId()
        : conversation.getBuyerId();
  }

  private Map<UUID, Auction> listingsFor(Collection<Conversation> conversations) {
    List<UUID> ids =
        conversations.stream()
            .map(Conversation::getListingId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();
    if (ids.isEmpty()) {
      return new HashMap<>();
    }
    return auctions.findAllById(ids).stream()
        .collect(Collectors.toMap(Auction::getId, auction -> auction));
  }
}
