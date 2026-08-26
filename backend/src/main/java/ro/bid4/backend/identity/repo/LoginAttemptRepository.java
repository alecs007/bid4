package ro.bid4.backend.identity.repo;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.LoginAttempt;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

  @Query(
      "select count(a) from LoginAttempt a "
          + "where a.emailAttempted = :email and a.successful = false and a.attemptedAt > :since")
  long countRecentFailures(@Param("email") String email, @Param("since") Instant since);
}
