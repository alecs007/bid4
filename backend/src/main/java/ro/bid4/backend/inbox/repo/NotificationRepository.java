package ro.bid4.backend.inbox.repo;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.inbox.domain.Notification;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  /** Split in two rather than taking a nullable cursor — see {@code ThreadItemRepository}. */
  @Query(
      "select n from Notification n where n.userId = :userId order by n.createdAt desc, n.id desc")
  List<Notification> firstPage(@Param("userId") UUID userId, Limit limit);

  @Query(
      """
      select n from Notification n
      where n.userId = :userId
        and (n.createdAt < :beforeAt or (n.createdAt = :beforeAt and n.id < :beforeId))
      order by n.createdAt desc, n.id desc
      """)
  List<Notification> pageBefore(
      @Param("userId") UUID userId,
      @Param("beforeAt") Instant beforeAt,
      @Param("beforeId") UUID beforeId,
      Limit limit);

  long countByUserIdAndReadAtIsNull(UUID userId);

  boolean existsByUserIdAndType(UUID userId, String type);

  /** Addressed by user as well as by id, so one account cannot mark another's as read. */
  @Modifying(flushAutomatically = true)
  @Query(
      """
      update Notification n set n.readAt = :at
      where n.id = :id and n.userId = :userId and n.readAt is null
      """)
  int markRead(@Param("id") UUID id, @Param("userId") UUID userId, @Param("at") Instant at);

  @Modifying(flushAutomatically = true)
  @Query("update Notification n set n.readAt = :at where n.userId = :userId and n.readAt is null")
  int markAllRead(@Param("userId") UUID userId, @Param("at") Instant at);
}
