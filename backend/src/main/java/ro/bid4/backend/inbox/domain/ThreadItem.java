package ro.bid4.backend.inbox.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One line in a thread — something somebody said, or a step of the sale.
 *
 * <p>Immutable once written, which is the whole point of it. The row fixes <em>where</em> a step
 * appears and <em>what it said at the time</em>; it never decides what may be done next. That is
 * read from the order's own status when the thread is drawn, so an item whose moment has passed
 * renders as a record and only the one matching the current status carries a button. A forged or
 * replayed item can show the wrong words and cannot produce a working control.
 *
 * <p>{@link #payload} is frozen for the same reason: the amount, the locker, the AWB as they were,
 * so history does not change its mind when the order moves on.
 */
@Getter
@Setter
@Entity
@Table(name = "thread_items")
public class ThreadItem {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "conversation_id", nullable = false, updatable = false)
  private UUID conversationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private ThreadItemKind kind;

  /** Null for SYSTEM and EVENT: the platform is not a person in the thread. */
  @Column(name = "sender_id", updatable = false)
  private UUID senderId;

  @Column private String body;

  /**
   * Ids of files already stored, in the order they were sent. Batched, or a page of thirty items
   * costs thirty queries to find out that twenty-eight of them carry no picture.
   */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "thread_attachments", joinColumns = @JoinColumn(name = "item_id"))
  @OrderColumn(name = "sort_order")
  @Column(name = "stored_file_id", nullable = false)
  @BatchSize(size = 64)
  private List<UUID> attachments = new ArrayList<>();

  /** The sale this step belongs to. Null on anything anybody said. */
  @Column(name = "order_id", updatable = false)
  private UUID orderId;

  @Column(name = "event_type", updatable = false)
  private String eventType;

  @Column(name = "order_status", updatable = false)
  private String orderStatus;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, String> payload;

  /**
   * Why the text was held up as an attempt to move the deal off bid4.
   *
   * <p>The item is still delivered. Dropping it silently teaches people to work around the check,
   * and the person on the other end is better served by a warning than by a gap in the thread.
   */
  @Column(name = "flagged_reason")
  private String flaggedReason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "deleted_at")
  private Instant deletedAt;

  public static ThreadItem text(UUID conversationId, UUID senderId, String body) {
    ThreadItem item = new ThreadItem();
    item.conversationId = conversationId;
    item.kind = ThreadItemKind.TEXT;
    item.senderId = senderId;
    item.body = body;
    return item;
  }

  public static ThreadItem image(UUID conversationId, UUID senderId, List<UUID> fileIds) {
    ThreadItem item = new ThreadItem();
    item.conversationId = conversationId;
    item.kind = ThreadItemKind.IMAGE;
    item.senderId = senderId;
    item.attachments = new ArrayList<>(fileIds);
    return item;
  }

  /**
   * A step of a sale.
   *
   * <p>{@code orderStatus} is the status at the time of writing, and is what lets the client tell
   * the one live card from the history above it — the event matching the order's current status is
   * the step being waited on, and only that one is drawn with a button.
   */
  public static ThreadItem event(
      UUID conversationId, UUID orderId, String eventType, String orderStatus) {
    ThreadItem item = new ThreadItem();
    item.conversationId = conversationId;
    item.kind = ThreadItemKind.EVENT;
    item.orderId = orderId;
    item.eventType = eventType;
    item.orderStatus = orderStatus;
    return item;
  }

  public static ThreadItem system(UUID conversationId, String body) {
    ThreadItem item = new ThreadItem();
    item.conversationId = conversationId;
    item.kind = ThreadItemKind.SYSTEM;
    item.body = body;
    return item;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof ThreadItem that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
