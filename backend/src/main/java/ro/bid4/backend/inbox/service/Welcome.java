package ro.bid4.backend.inbox.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.inbox.domain.Conversation;
import ro.bid4.backend.inbox.domain.ConversationKind;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.ParticipantRole;
import ro.bid4.backend.inbox.domain.ThreadItem;
import ro.bid4.backend.inbox.repo.ConversationParticipantRepository;
import ro.bid4.backend.inbox.repo.ConversationRepository;
import ro.bid4.backend.inbox.repo.NotificationRepository;
import ro.bid4.backend.inbox.repo.ThreadItemRepository;

@Service
public class Welcome {
  public static final String NOTIFICATION_TYPE = "WELCOME";

  private static final String GREETING =
      "Bun venit pe bid4! În această conversație ne poți adresa orice întrebare despre platformă,"
          + " licitații sau comenzi. Echipa bid4 îți stă la dispoziție și îți va răspunde în cel"
          + " mai scurt timp.";

  private final ConversationRepository conversations;
  private final ConversationParticipantRepository participants;
  private final ThreadItemRepository items;
  private final NotificationRepository notifications;
  private final InboxEvents events;

  public Welcome(
      ConversationRepository conversations,
      ConversationParticipantRepository participants,
      ThreadItemRepository items,
      NotificationRepository notifications,
      InboxEvents events) {
    this.conversations = conversations;
    this.participants = participants;
    this.items = items;
    this.notifications = notifications;
    this.events = events;
  }

  @Transactional
  public void ensureFor(UUID userId) {
    ensureThread(userId);
    ensureNotification(userId);
  }

  private void ensureThread(UUID userId) {
    if (conversations.findSupportThread(userId).isPresent()) {
      return;
    }

    Conversation conversation = new Conversation();
    conversation.setKind(ConversationKind.SUPPORT);
    conversation.setBuyerId(userId);
    conversation.setLastItemAt(Instant.now());
    Conversation saved = conversations.save(conversation);

    ThreadItem greeting = ThreadItem.system(saved.getId(), GREETING);
    greeting.setCreatedAt(Instant.now());
    items.save(greeting);

    ConversationParticipant member =
        new ConversationParticipant(saved.getId(), userId, ParticipantRole.BUYER);
    member.setUnreadCount(1);
    participants.save(member);
  }

  private void ensureNotification(UUID userId) {
    if (notifications.existsByUserIdAndType(userId, NOTIFICATION_TYPE)) {
      return;
    }
    var saved =
        notifications.save(
            ro.bid4.backend.inbox.domain.Notification.of(
                userId, NOTIFICATION_TYPE, Map.of(), "/cont/inbox"));
    events.notified(userId, saved.getId());
  }
}
