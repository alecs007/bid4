package ro.bid4.backend.inbox.repo;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.inbox.domain.ThreadItem;

public interface ThreadItemRepository extends JpaRepository<ThreadItem, UUID> {
  @Query(
      """
      select i from ThreadItem i
      where i.conversationId = :conversationId and i.deletedAt is null
      order by i.createdAt desc, i.id desc
      """)
  List<ThreadItem> firstPage(@Param("conversationId") UUID conversationId, Limit limit);

  @Query(
      """
      select i from ThreadItem i
      where i.conversationId = :conversationId
        and i.deletedAt is null
        and (i.createdAt < :beforeAt or (i.createdAt = :beforeAt and i.id < :beforeId))
      order by i.createdAt desc, i.id desc
      """)
  List<ThreadItem> pageBefore(
      @Param("conversationId") UUID conversationId,
      @Param("beforeAt") Instant beforeAt,
      @Param("beforeId") UUID beforeId,
      Limit limit);

  @Query(
      value =
          """
          select distinct on (i.conversation_id) i.*
          from thread_items i
          where i.conversation_id = any (:conversationIds) and i.deleted_at is null
          order by i.conversation_id, i.created_at desc, i.id desc
          """,
      nativeQuery = true)
  List<ThreadItem> findNewestPerConversation(@Param("conversationIds") UUID[] conversationIds);

  long countByConversationIdAndSenderIdAndCreatedAtAfter(
      UUID conversationId, UUID senderId, Instant after);

  boolean existsByOrderIdAndEventType(UUID orderId, String eventType);
}
