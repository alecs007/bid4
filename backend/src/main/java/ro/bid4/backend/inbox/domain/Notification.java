package ro.bid4.backend.inbox.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A pointer, not a copy.
 *
 * <p>Almost everything worth telling somebody has already happened somewhere else — in a thread, on
 * a listing, on a cause. A notification that carried its own version of the news would be a second
 * source of truth, and the two would drift the first time the wording changed. What is stored is a
 * type, the few values its sentence needs, and where to go.
 *
 * <p>{@code deepLink} is checked to be relative in the schema. An absolute URL here is an open
 * redirect the moment anything but us writes one.
 */
@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(nullable = false, updatable = false)
  private String type;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false)
  private Map<String, String> payload = Map.of();

  @Column(name = "deep_link")
  private String deepLink;

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public static Notification of(
      UUID userId, String type, Map<String, String> payload, String deepLink) {
    Notification notification = new Notification();
    notification.userId = userId;
    notification.type = type;
    notification.payload = payload == null ? Map.of() : payload;
    notification.deepLink = deepLink;
    return notification;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof Notification that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
