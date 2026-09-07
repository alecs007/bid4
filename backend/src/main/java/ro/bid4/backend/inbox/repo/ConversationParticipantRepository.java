package ro.bid4.backend.inbox.repo;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.ConversationParticipantId;

public interface ConversationParticipantRepository
    extends JpaRepository<ConversationParticipant, ConversationParticipantId> {

  /**
   * Whether this account may read this thread at all, and on which side.
   *
   * <p>Every read and every write in the inbox goes through here first. A conversation id is not a
   * permission — it is only a name for something that may or may not be any of the caller's
   * business.
   */
  @Query(
      """
      select p from ConversationParticipant p
      where p.id.conversationId = :conversationId and p.id.userId = :userId
      """)
  Optional<ConversationParticipant> findMembership(
      @Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

  @Query(
      """
      select p from ConversationParticipant p
      where p.id.conversationId in :conversationIds and p.id.userId = :userId
      """)
  List<ConversationParticipant> findMemberships(
      @Param("conversationIds") Collection<UUID> conversationIds, @Param("userId") UUID userId);

  @Query("select p from ConversationParticipant p where p.id.conversationId = :conversationId")
  List<ConversationParticipant> findAllIn(@Param("conversationId") UUID conversationId);

  /**
   * Counts one unread item against everybody in the thread except its author.
   *
   * <p>One statement, so two people writing at once cannot read-modify-write over each other's
   * count. The author is excluded here rather than by the caller, because forgetting it is how an
   * inbox ends up with a badge for something you said yourself.
   */
  @Modifying(flushAutomatically = true)
  @Query(
      """
      update ConversationParticipant p set p.unreadCount = p.unreadCount + 1, p.archived = false
      where p.id.conversationId = :conversationId and p.id.userId <> :exceptUserId
      """)
  int markUnreadForOthers(
      @Param("conversationId") UUID conversationId, @Param("exceptUserId") UUID exceptUserId);

  /** The same, for an item the platform wrote — which is nobody's own, so nobody is excluded. */
  @Modifying(flushAutomatically = true)
  @Query(
      """
      update ConversationParticipant p set p.unreadCount = p.unreadCount + 1, p.archived = false
      where p.id.conversationId = :conversationId
      """)
  int markUnreadForAll(@Param("conversationId") UUID conversationId);

  @Modifying(flushAutomatically = true)
  @Query(
      """
      update ConversationParticipant p set p.unreadCount = 0, p.lastReadAt = :at
      where p.id.conversationId = :conversationId and p.id.userId = :userId
      """)
  int markRead(
      @Param("conversationId") UUID conversationId,
      @Param("userId") UUID userId,
      @Param("at") Instant at);

  /** The header badge: how many threads have anything waiting, not how many items are waiting. */
  @Query(
      """
      select count(p) from ConversationParticipant p
      where p.id.userId = :userId and p.unreadCount > 0 and p.archived = false
      """)
  long countUnreadThreads(@Param("userId") UUID userId);
}
