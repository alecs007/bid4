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

/**
 * What is in the inbox before anything has happened.
 *
 * <p>An empty inbox is the worst first impression a feature like this can make: it looks broken, it
 * explains nothing, and the one moment somebody is willing to read how a thing works is the moment
 * they open it and find nothing to read. So both halves start with something — a thread from bid4
 * that says what this place is for, and a line in the notifications saying the same in one
 * sentence.
 *
 * <p>Written on first read rather than at registration, because accounts already exist and a
 * greeting only for people who sign up after today is a greeting most people never get. Idempotent
 * on a lookup, so opening the inbox twice does not say hello twice.
 */
@Service
public class Welcome {

  public static final String NOTIFICATION_TYPE = "WELCOME";

  private static final String GREETING =
      "Bun venit pe bid4! Aici ajung mesajele despre anunțurile tale și pașii fiecărei vânzări — "
          + "întrebările și afacerea stau în același fir, ca să vezi dintr-o privire unde ai rămas.";

  private static final String HOW_IT_WORKS =
      "Când o ofertă e acceptată, tot ce urmează apare aici: alegi livrarea, plătești în siguranță, "
          + "iar banii ajung la vânzător și la cauză abia după ce confirmi că ai primit coletul. "
          + "Dacă ai nevoie de noi, scrie-ne chiar în această conversație.";

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

  /** Makes sure this account has both. Cheap when it already does, which is almost always. */
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

    // Written a millisecond apart on purpose. The thread is ordered by time,
    // and two lines saved in the same instant come back in whichever order the
    // index felt like — which put the explanation above the greeting.
    Instant now = Instant.now();
    ThreadItem greeting = ThreadItem.system(saved.getId(), GREETING);
    greeting.setCreatedAt(now);
    items.save(greeting);

    ThreadItem howItWorks = ThreadItem.system(saved.getId(), HOW_IT_WORKS);
    howItWorks.setCreatedAt(now.plusMillis(1));
    items.save(howItWorks);

    // The member is the only participant. An operator joins when there is
    // something to answer, rather than every account carrying a second row for
    // a conversation nobody has started.
    //
    // Unread on the row rather than through markUnreadForAll: a bulk update does
    // not reach the instance this method is holding, and the list that follows
    // would read the stale zero. Two items, so two.
    ConversationParticipant member =
        new ConversationParticipant(saved.getId(), userId, ParticipantRole.BUYER);
    member.setUnreadCount(2);
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
