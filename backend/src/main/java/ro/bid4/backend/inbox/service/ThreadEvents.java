package ro.bid4.backend.inbox.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.inbox.domain.Conversation;
import ro.bid4.backend.inbox.domain.ConversationKind;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.ParticipantRole;
import ro.bid4.backend.inbox.domain.ThreadItem;
import ro.bid4.backend.inbox.repo.ConversationParticipantRepository;
import ro.bid4.backend.inbox.repo.ConversationRepository;
import ro.bid4.backend.inbox.repo.ThreadItemRepository;

@Service
public class ThreadEvents {
  private final ConversationRepository conversations;
  private final ConversationParticipantRepository participants;
  private final ThreadItemRepository items;
  private final InboxEvents events;

  public ThreadEvents(
      ConversationRepository conversations,
      ConversationParticipantRepository participants,
      ThreadItemRepository items,
      InboxEvents events) {
    this.conversations = conversations;
    this.participants = participants;
    this.items = items;
    this.events = events;
  }

  @Transactional
  public Conversation ensureThread(UUID listingId, UUID buyerId, UUID sellerId) {
    return conversations
        .findListingThread(listingId, buyerId)
        .orElseGet(() -> create(listingId, buyerId, sellerId));
  }

  @Transactional
  public void attachOrder(UUID conversationId, UUID orderId) {
    conversations
        .findById(conversationId)
        .ifPresent(conversation -> conversation.setOrderId(orderId));
  }

  @Transactional(propagation = Propagation.REQUIRED)
  public void post(
      UUID conversationId,
      UUID orderId,
      String eventType,
      String orderStatus,
      String body,
      Map<String, String> payload) {
    if (items.existsByOrderIdAndEventType(orderId, eventType)) {
      return;
    }

    ThreadItem item = ThreadItem.event(conversationId, orderId, eventType, orderStatus);
    item.setBody(body);
    item.setPayload(payload);

    ThreadItem saved = items.save(item);
    conversations.touch(conversationId, saved.getCreatedAt());
    participants.markUnreadForAll(conversationId);
    notifyParticipants(conversationId, saved.getId());
  }

  @Transactional
  public void offer(
      UUID listingId,
      UUID buyerId,
      UUID sellerId,
      String eventType,
      String body,
      Map<String, String> payload) {
    UUID conversationId = ensureThread(listingId, buyerId, sellerId).getId();

    ThreadItem item = ThreadItem.event(conversationId, null, eventType, null);
    item.setBody(body);
    item.setPayload(payload);

    ThreadItem saved = items.save(item);
    conversations.touch(conversationId, saved.getCreatedAt());
    participants.markUnreadForOthers(conversationId, buyerId);
    notifyParticipants(conversationId, saved.getId());
  }

  @Transactional
  public void system(UUID conversationId, String body) {
    ThreadItem saved = items.save(ThreadItem.system(conversationId, body));
    conversations.touch(conversationId, saved.getCreatedAt());
    participants.markUnreadForAll(conversationId);
    notifyParticipants(conversationId, saved.getId());
  }

  private void notifyParticipants(UUID conversationId, UUID itemId) {
    for (ConversationParticipant party : participants.findAllIn(conversationId)) {
      events.itemArrived(party.getUserId(), conversationId, itemId);
    }
  }

  private Conversation create(UUID listingId, UUID buyerId, UUID sellerId) {
    Conversation conversation = new Conversation();
    conversation.setKind(ConversationKind.LISTING);
    conversation.setListingId(listingId);
    conversation.setBuyerId(buyerId);
    conversation.setSellerId(sellerId);
    conversation.setLastItemAt(Instant.now());
    Conversation saved = conversations.save(conversation);

    participants.save(new ConversationParticipant(saved.getId(), buyerId, ParticipantRole.BUYER));
    participants.save(new ConversationParticipant(saved.getId(), sellerId, ParticipantRole.SELLER));
    return saved;
  }
}
