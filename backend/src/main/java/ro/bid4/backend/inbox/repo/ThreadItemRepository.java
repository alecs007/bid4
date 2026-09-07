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

  /**
   * The newest items in a thread.
   *
   * <p>Keyset paging, for the reason every list in this application uses it: a thread is written to
   * while it is being read, so an offset both drifts under the reader and costs more the further
   * back they scroll. Ordered the way the index runs, so a page is a range scan and nothing is
   * sorted.
   *
   * <p>Two methods rather than one with a nullable cursor. A parameter that appears only inside
   * {@code :cursor is null} has no type Postgres can infer from its use, and the driver is refused
   * with "could not determine data type" — but the split earns its keep anyway, because the first
   * page is the common one and has no business carrying a comparison against a cursor that is not
   * there.
   */
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

  /**
   * The newest item in each of a page of threads, for the inbox list.
   *
   * <p>Native, because {@code DISTINCT ON} is the one thing Postgres does here that JPQL cannot
   * express — it walks the index backwards and stops at the first row per thread. The alternative
   * shapes are a window function over every item ever written, or one query per row.
   */
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
}
