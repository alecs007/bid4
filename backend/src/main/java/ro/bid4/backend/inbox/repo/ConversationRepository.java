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
import ro.bid4.backend.inbox.domain.ConversationKind;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
  @Query(
      """
      select c from Conversation c
      where c.kind = ro.bid4.backend.inbox.domain.ConversationKind.LISTING
        and c.listingId = :listingId and c.buyerId = :buyerId
      """)
  Optional<Conversation> findListingThread(
      @Param("listingId") UUID listingId, @Param("buyerId") UUID buyerId);

  long countByKind(ConversationKind kind);

  @Query(
      """
      select c from Conversation c
      where c.kind = ro.bid4.backend.inbox.domain.ConversationKind.SUPPORT
        and c.buyerId = :userId
      """)
  Optional<Conversation> findSupportThread(@Param("userId") UUID userId);

  @Query(
      """
      select c from Conversation c
      join ConversationParticipant p on p.id.conversationId = c.id
      where p.id.userId = :userId
        and p.archived = :archived
        and c.kind <> ro.bid4.backend.inbox.domain.ConversationKind.SUPPORT
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
        and c.kind <> ro.bid4.backend.inbox.domain.ConversationKind.SUPPORT
        and (c.lastItemAt < :beforeAt or (c.lastItemAt = :beforeAt and c.id < :beforeId))
      order by c.lastItemAt desc, c.id desc
      """)
  List<Conversation> pageForBefore(
      @Param("userId") UUID userId,
      @Param("archived") boolean archived,
      @Param("beforeAt") Instant beforeAt,
      @Param("beforeId") UUID beforeId,
      Limit limit);

  @Modifying(flushAutomatically = true)
  @Query("update Conversation c set c.lastItemAt = :at where c.id = :id")
  int touch(@Param("id") UUID id, @Param("at") Instant at);
}
