package ro.bid4.backend.inbox.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.inbox.api.dto.CursorPage;
import ro.bid4.backend.inbox.api.dto.NotificationResponse;
import ro.bid4.backend.inbox.domain.Notification;
import ro.bid4.backend.inbox.repo.NotificationRepository;

@Service
public class NotificationService {
  private static final int PAGE = 25;

  private final NotificationRepository notifications;
  private final InboxMapper mapper;
  private final InboxEvents events;
  private final Welcome welcome;

  public NotificationService(
      NotificationRepository notifications,
      InboxMapper mapper,
      InboxEvents events,
      Welcome welcome) {
    this.notifications = notifications;
    this.mapper = mapper;
    this.events = events;
    this.welcome = welcome;
  }

  @Transactional
  public CursorPage<NotificationResponse> list(String cursor, Viewer viewer) {
    UUID me = required(viewer);
    if (cursor == null) {
      welcome.ensureFor(me);
    }

    Instant before = Cursors.instantOf(cursor);
    List<Notification> page =
        before == null
            ? notifications.firstPage(me, Limit.of(PAGE + 1))
            : notifications.pageBefore(me, before, Cursors.idOf(cursor), Limit.of(PAGE + 1));

    boolean more = page.size() > PAGE;
    List<Notification> visible = more ? page.subList(0, PAGE) : page;

    return CursorPage.of(
        visible.stream().map(mapper::toNotification).toList(),
        more && !visible.isEmpty()
            ? Cursors.encode(visible.getLast().getCreatedAt(), visible.getLast().getId())
            : null);
  }

  @Transactional
  public void markRead(UUID id, Viewer viewer) {
    UUID me = required(viewer);
    notifications.markRead(id, me, Instant.now());
    events.unreadChanged(me);
  }

  @Transactional
  public void markAllRead(Viewer viewer) {
    UUID me = required(viewer);
    notifications.markAllRead(me, Instant.now());
    events.unreadChanged(me);
  }

  @Transactional
  public Notification notify(
      UUID userId, String type, Map<String, String> payload, String deepLink) {
    Notification saved = notifications.save(Notification.of(userId, type, payload, deepLink));
    events.notified(userId, saved.getId());
    return saved;
  }

  private static UUID required(Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED, "Autentifică-te pentru a continua.");
    }
    return viewer.id();
  }
}
