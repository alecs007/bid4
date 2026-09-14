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

@Service
public class InboxEvents {
  public static final String CHANNEL = "inbox:events";

  private static final Logger log = LoggerFactory.getLogger(InboxEvents.class);

  private static final long TIMEOUT_MILLIS = 30 * 60 * 1000L;

  private final Map<UUID, Set<SseEmitter>> listeners = new ConcurrentHashMap<>();
  private final StringRedisTemplate redis;
  private final ObjectMapper json;

  public InboxEvents(StringRedisTemplate redis, ObjectMapper json) {
    this.redis = redis;
    this.json = json;
  }

  public SseEmitter subscribe(UUID userId) {
    SseEmitter emitter = new SseEmitter(TIMEOUT_MILLIS);
    listeners.computeIfAbsent(userId, key -> new CopyOnWriteArraySet<>()).add(emitter);

    emitter.onCompletion(() -> drop(userId, emitter));
    emitter.onTimeout(() -> drop(userId, emitter));
    emitter.onError(error -> drop(userId, emitter));

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
      log.warn("Could not publish an inbox event", failed);
    }
  }

  private void send(SseEmitter emitter, String type, Map<String, String> data) {
    try {
      emitter.send(SseEmitter.event().name(type).data(data));
    } catch (IOException | IllegalStateException gone) {
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

  public record Envelope(String userId, String type, Map<String, String> data) {}
}
