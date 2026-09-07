package ro.bid4.backend.inbox.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
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

/**
 * How the rest of the application writes into a thread.
 *
 * <p>The dependency runs one way on purpose: orders knows about the inbox, and the inbox knows
 * nothing about orders. What arrives here is a string naming a step and a map of values to show, so
 * a second thing that wants to narrate itself into a conversation — a dispute, an operator, a cause
 * decision — needs no change on this side.
 *
 * <p>Posting a step is idempotent. A unique index holds one event of each kind per order, so a
 * transition that is retried after a failed transaction cannot leave the thread with two copies of
 * "banii sunt în siguranță". The insert is allowed to collide and the collision is the answer.
 */
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

  /**
   * The thread about this listing between these two, opened if it is not already.
   *
   * <p>A sale does not start a new conversation. If the buyer asked a question a week ago, the
   * acceptance appears under it.
   */
  @Transactional
  public Conversation ensureThread(UUID listingId, UUID buyerId, UUID sellerId) {
    return conversations
        .findListingThread(listingId, buyerId)
        .orElseGet(() -> create(listingId, buyerId, sellerId));
  }

  /** Ties a thread to the sale it is now about. */
  @Transactional
  public void attachOrder(UUID conversationId, UUID orderId) {
    conversations
        .findById(conversationId)
        .ifPresent(conversation -> conversation.setOrderId(orderId));
  }

  /**
   * Writes one step of a sale into the thread.
   *
   * <p>{@code orderStatus} is the status at the time of writing and never changes afterwards. It is
   * how the client tells the one live card from the history above it: the event whose status equals
   * the order's current one is the step being waited on, and only that one is drawn with a button.
   */
  @Transactional(propagation = Propagation.REQUIRED)
  public void post(
      UUID conversationId,
      UUID orderId,
      String eventType,
      String orderStatus,
      String body,
      Map<String, String> payload) {

    ThreadItem item = ThreadItem.event(conversationId, orderId, eventType, orderStatus);
    item.setBody(body);
    item.setPayload(payload);

    try {
      ThreadItem saved = items.saveAndFlush(item);
      conversations.touch(conversationId, saved.getCreatedAt());
      participants.markUnreadForAll(conversationId);
      notifyParticipants(conversationId, saved.getId());
    } catch (DataIntegrityViolationException alreadyPosted) {
      // The step is already in the thread. That is the index doing its job, and
      // the caller asked for the card to exist rather than for it to be new.
      return;
    }
  }

  /** A plain line from the platform, for anything that is not a step of a sale. */
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
