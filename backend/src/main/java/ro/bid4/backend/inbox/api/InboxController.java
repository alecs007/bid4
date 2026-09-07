package ro.bid4.backend.inbox.api;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.inbox.api.dto.ConversationSummary;
import ro.bid4.backend.inbox.api.dto.CursorPage;
import ro.bid4.backend.inbox.api.dto.NotificationResponse;
import ro.bid4.backend.inbox.api.dto.OpenThreadRequest;
import ro.bid4.backend.inbox.api.dto.SendMessageRequest;
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.api.dto.ThreadResponse;
import ro.bid4.backend.inbox.api.dto.UnreadCounts;
import ro.bid4.backend.inbox.service.InboxEvents;
import ro.bid4.backend.inbox.service.InboxService;
import ro.bid4.backend.inbox.service.NotificationService;
import ro.bid4.backend.security.web.Viewers;

/**
 * The inbox, over HTTP.
 *
 * <p>Nothing here answers an anonymous caller, and nothing here takes a user id. A thread is opened
 * from a listing and reached by its own id, and the service decides whether the caller has any
 * business with it — this class only carries the token through.
 */
@RestController
@RequestMapping("/inbox")
public class InboxController {

  private final InboxService inbox;
  private final NotificationService notifications;
  private final InboxEvents events;

  public InboxController(
      InboxService inbox, NotificationService notifications, InboxEvents events) {
    this.inbox = inbox;
    this.notifications = notifications;
    this.events = events;
  }

  // -- Mesaje ------------------------------------------------------------------------------------

  @GetMapping("/conversations")
  CursorPage<ConversationSummary> conversations(
      @RequestParam(required = false) String cursor,
      @RequestParam(defaultValue = "false") boolean archived,
      @AuthenticationPrincipal Jwt jwt) {
    return inbox.list(cursor, archived, Viewers.from(jwt));
  }

  /**
   * Opens the thread about a listing, or hands back the one already there.
   *
   * <p>200 either way rather than 201 on the first call: the caller asked for the conversation
   * about a listing, and whether this request happened to be the one that created the row is not
   * something they should have to branch on.
   */
  @PostMapping("/conversations")
  ThreadResponse open(
      @Valid @RequestBody OpenThreadRequest request, @AuthenticationPrincipal Jwt jwt) {
    return inbox.open(request, Viewers.from(jwt));
  }

  @GetMapping("/conversations/{id}")
  ThreadResponse thread(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return inbox.thread(id, Viewers.from(jwt));
  }

  /** Older items, for a thread being scrolled back through. */
  @GetMapping("/conversations/{id}/items")
  CursorPage<ThreadItemResponse> items(
      @PathVariable UUID id,
      @RequestParam(required = false) String cursor,
      @AuthenticationPrincipal Jwt jwt) {
    return inbox.items(id, cursor, Viewers.from(jwt));
  }

  @PostMapping("/conversations/{id}/items")
  ResponseEntity<ThreadItemResponse> send(
      @PathVariable UUID id,
      @Valid @RequestBody SendMessageRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(inbox.send(id, request, Viewers.from(jwt)));
  }

  @PutMapping("/conversations/{id}/read")
  ResponseEntity<Void> markRead(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    inbox.markRead(id, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/conversations/{id}/archive")
  ResponseEntity<Void> archive(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    inbox.setArchived(id, true, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/conversations/{id}/archive")
  ResponseEntity<Void> unarchive(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    inbox.setArchived(id, false, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/conversations/{id}/mute")
  ResponseEntity<Void> mute(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    inbox.setMuted(id, true, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/conversations/{id}/mute")
  ResponseEntity<Void> unmute(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    inbox.setMuted(id, false, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  // -- Notificări --------------------------------------------------------------------------------

  @GetMapping("/notifications")
  CursorPage<NotificationResponse> notifications(
      @RequestParam(required = false) String cursor, @AuthenticationPrincipal Jwt jwt) {
    return notifications.list(cursor, Viewers.from(jwt));
  }

  @PutMapping("/notifications/{id}/read")
  ResponseEntity<Void> readOne(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    notifications.markRead(id, Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/notifications/read")
  ResponseEntity<Void> readAll(@AuthenticationPrincipal Jwt jwt) {
    notifications.markAllRead(Viewers.from(jwt));
    return ResponseEntity.noContent().build();
  }

  // -- The badge, and the nudge ------------------------------------------------------------------

  @GetMapping("/unread")
  UnreadCounts unread(@AuthenticationPrincipal Jwt jwt) {
    return inbox.unread(Viewers.from(jwt));
  }

  /**
   * One long-lived response per tab, carrying nothing but "go and look".
   *
   * <p>The token is read here and nowhere after: the connection belongs to whoever opened it for as
   * long as it lasts, and every event it carries is a pointer to a fetch that will authorise itself
   * properly. Nothing readable travels down this pipe.
   */
  @GetMapping("/stream")
  SseEmitter stream(@AuthenticationPrincipal Jwt jwt) {
    Viewer viewer = Viewers.from(jwt);
    return events.subscribe(viewer.id());
  }
}
