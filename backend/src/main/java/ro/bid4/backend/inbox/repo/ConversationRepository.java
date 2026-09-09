package ro.bid4.backend.inbox.repo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.inbox.domain.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

  /** The thread a buyer already has on a listing, if they have written before. */
  @Query(
      """
      select c from Conversation c
      where c.kind = ro.bid4.backend.inbox.domain.ConversationKind.LISTING
        and c.listingId = :listingId and c.buyerId = :buyerId
      """)
  Optional<Conversation> findListingThread(
      @Param("listingId") UUID listingId, @Param("buyerId") UUID buyerId);

  /** The thread bid4 itself has with a member. One each, and it is always there. */
  @Query(
      """
      select c from Conversation c
      where c.kind = ro.bid4.backend.inbox.domain.ConversationKind.SUPPORT
        and c.buyerId = :userId
      """)
  Optional<Conversation> findSupportThread(@Param("userId") UUID userId);

  /**
   * One page of somebody's inbox, newest activity first.
   *
   * <p>Keyset rather than offset: an inbox is appended to constantly, so a page number drifts under
   * the reader between one request and the next, and the cost of skipping rows grows with how far
   * down they have gone. The cursor is the timestamp of the last row seen, with the id breaking a
   * tie between two threads touched in the same instant.
   *
   * <p>Joined through the participant row rather than matched on buyer_id or seller_id, because
   * that row is the permission: no participant, no thread, and support joining a dispute needs no
   * second branch here.
   *
   * <p>Split in two rather than taking a nullable cursor — see {@code ThreadItemRepository}, where
   * the same split is explained.
   */
  @Query(
      """
      select c from Conversation c
      join ConversationParticipant p on p.id.conversationId = c.id
      where p.id.userId = :userId and p.archived = :archived
      order by c.lastItemAt desc, c.id desc
      """)
  List<Conversation> firstPageFor(
      @Param("userId") UUID userId, @Param("archived") boolean archived, Limit limit);

  @Query(
      """
      select c from Conversation c
      join ConversationParticipant p on p.id.conversationId = c.id
      where p.id.userId = :userId
        and p.archived = :archived
        and (c.lastItemAt < :beforeAt or (c.lastItemAt = :beforeAt and c.id < :beforeId))
      order by c.lastItemAt desc, c.id desc
      """)
  List<Conversation> pageForBefore(
      @Param("userId") UUID userId,
      @Param("archived") boolean archived,
      @Param("beforeAt") Instant beforeAt,
      @Param("beforeId") UUID beforeId,
      Limit limit);

  /**
   * Moves a thread to the top of both inboxes.
   *
   * <p>A statement rather than a setter on the managed entity: the caller has just written an item
   * and is about to answer, and this is the only field of the row it touches.
   */
  @Modifying(flushAutomatically = true)
  @Query("update Conversation c set c.lastItemAt = :at where c.id = :id")
  int touch(@Param("id") UUID id, @Param("at") Instant at);
}
