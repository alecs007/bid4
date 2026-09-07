package ro.bid4.backend.inbox.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * One person's side of one thread: what they have read, and whether they still want to hear about
 * it.
 *
 * <p>This table is also the permission. A thread is readable because there is a row here, not
 * because the caller knows its id — which is what keeps a conversation id from being a capability
 * somebody can guess or be handed.
 *
 * <p>{@code unreadCount} is kept rather than counted. The badge is read on every page load and
 * written once per item; counting unread rows on each read would make the cheapest thing in the
 * header the most expensive query behind it.
 */
@Getter
@Setter
@Entity
@Table(name = "conversation_participants")
public class ConversationParticipant {

  @EmbeddedId private ConversationParticipantId id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ParticipantRole role;

  @Column(name = "last_read_at")
  private Instant lastReadAt;

  @Column(name = "unread_count", nullable = false)
  private int unreadCount = 0;

  @Column(nullable = false)
  private boolean archived = false;

  @Column(nullable = false)
  private boolean muted = false;

  @Column(name = "joined_at", nullable = false, updatable = false)
  private Instant joinedAt = Instant.now();

  protected ConversationParticipant() {}

  public ConversationParticipant(UUID conversationId, UUID userId, ParticipantRole role) {
    this.id = new ConversationParticipantId(conversationId, userId);
    this.role = role;
  }

  public UUID getUserId() {
    return id.getUserId();
  }

  public UUID getConversationId() {
    return id.getConversationId();
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof ConversationParticipant that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
