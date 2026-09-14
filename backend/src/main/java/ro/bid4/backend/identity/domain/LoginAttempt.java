package ro.bid4.backend.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "login_attempts")
public class LoginAttempt {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "email_attempted", nullable = false)
  private String emailAttempted;

  @Column(name = "user_id")
  private UUID userId;

  @JdbcTypeCode(SqlTypes.INET)
  @Column(name = "ip", nullable = false, columnDefinition = "inet")
  private String ip;

  @Column(name = "user_agent")
  private String userAgent;

  @Column(nullable = false)
  private boolean successful;

  @Column(name = "failure_reason", length = 32)
  private String failureReason;

  @Column(name = "attempted_at", nullable = false)
  private Instant attemptedAt = Instant.now();

  public static LoginAttempt of(
      String email, UUID userId, String ip, String userAgent, boolean successful, String reason) {
    LoginAttempt attempt = new LoginAttempt();
    attempt.emailAttempted = email;
    attempt.userId = userId;
    attempt.ip = ip;
    attempt.userAgent = userAgent;
    attempt.successful = successful;
    attempt.failureReason = reason;
    return attempt;
  }
}
