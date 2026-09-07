package ro.bid4.backend.inbox.service;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tools.jackson.databind.ObjectMapper;

/**
 * Tells a browser something arrived, without it asking.
 *
 * <p>Server-sent events rather than a socket. Everything that has to travel unprompted travels one
 * way — an item appeared, a count changed, and in phase two an order moved — while everything the
 * user does goes up as an ordinary POST. A WebSocket would be a second protocol, a second
 * authentication path and a second thing to debug, in exchange for a direction nothing needs.
 *
 * <p>The emitters are held in this process, so a fan-out through Redis is what makes a second
 * instance work: the process that wrote the message publishes, every process delivers to whichever
 * of those users it happens to be holding a connection for. Without it, two backends behind a load
 * balancer would each notify half the site.
 *
 * <p>The payload is deliberately thin — who, which thread, which item. It is a nudge to go and
 * read, not the reading itself, so nothing here has to repeat an authorisation decision that the
 * fetch it triggers will make properly.
 */
@Service
public class InboxEvents {

  public static final String CHANNEL = "inbox:events";

  private static final Logger log = LoggerFactory.getLogger(InboxEvents.class);

  /** Long enough to outlast a quiet afternoon; the browser reconnects on its own when it lapses. */
  private static final long TIMEOUT_MILLIS = 30 * 60 * 1000L;

  private final Map<UUID, Set<SseEmitter>> listeners = new ConcurrentHashMap<>();
  private final StringRedisTemplate redis;
  private final ObjectMapper json;

  public InboxEvents(StringRedisTemplate redis, ObjectMapper json) {
    this.redis = redis;
    this.json = json;
  }

  /** One browser tab, listening. */
  public SseEmitter subscribe(UUID userId) {
    SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
    listeners.computeIfAbsent(userId, key -> new CopyOnWriteArraySet<>()).add(emitter);

    emitter.onCompletion(() -> drop(userId, emitter));
    emitter.onTimeout(() -> drop(userId, emitter));
    emitter.onError(error -> drop(userId, emitter));

    // A first byte immediately, so a proxy that buffers until it sees output
    // does not hold the whole connection open while the browser waits.
    send(emitter, "ready", Map.of());
    return emitter;
  }

  public void itemArrived(UUID userId, UUID conversationId, UUID itemId) {
    publish(
        new Envelope(
            userId.toString(),
            "item",
            Map.of("conversationId", conversationId.toString(), "itemId", itemId.toString())));
  }

  public void unreadChanged(UUID userId) {
    publish(new Envelope(userId.toString(), "unread", Map.of()));
  }

  public void notified(UUID userId, UUID notificationId) {
    publish(
        new Envelope(userId.toString(), "notification", Map.of("id", notificationId.toString())));
  }

  /**
   * Hands one envelope to whichever tabs this process is holding.
   *
   * <p>Called by the Redis subscriber, on every instance including the one that published — which
   * is why publishing does not also deliver locally. One path in, so a message cannot arrive twice.
   */
  void deliver(String raw) {
    try {
      Envelope envelope = json.readValue(raw, Envelope.class);
      Set<SseEmitter> tabs = listeners.get(UUID.fromString(envelope.userId()));
      if (tabs == null) {
        return;
      }
      for (SseEmitter tab : tabs) {
        send(tab, envelope.type(), envelope.data());
      }
    } catch (RuntimeException malformed) {
      log.warn("Ignoring an unreadable inbox event", malformed);
    }
  }

  private void publish(Envelope envelope) {
    try {
      redis.convertAndSend(CHANNEL, json.writeValueAsString(envelope));
    } catch (RuntimeException failed) {
      // A notification is a convenience. The message itself is already written,
      // and the next fetch will find it — losing the nudge is not worth failing
      // the request that caused it.
      log.warn("Could not publish an inbox event", failed);
    }
  }

  private void send(SseEmitter emitter, String type, Map<String, String> data) {
    try {
      emitter.send(SseEmitter.event().name(type).data(data));
    } catch (IOException | IllegalStateException gone) {
      // The tab closed between the check and the write. Nothing to do about it
      // and nothing worth logging at more than debug.
      emitter.complete();
    }
  }

  private void drop(UUID userId, SseEmitter emitter) {
    Set<SseEmitter> tabs = listeners.get(userId);
    if (tabs != null) {
      tabs.remove(emitter);
      if (tabs.isEmpty()) {
        listeners.remove(userId, tabs);
      }
    }
  }

  /** Who it is for, what happened, and the ids needed to go and look. */
  public record Envelope(String userId, String type, Map<String, String> data) {}
}
