package ro.bid4.backend.common.audit;

import java.util.UUID;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.audit.domain.AuditEvent;
import ro.bid4.backend.common.audit.repo.AuditEventRepository;

/**
 * Writes the audit trail.
 *
 * <p>A WARN line is not a record. It is rotated away, it is not queryable, and nobody can answer
 * "has this happened to this account before" from it — which is precisely the question a security
 * event raises. This puts the same facts in a table with the account on them.
 */
@Service
public class AuditLog {

  /** A refresh token was presented after it had already been exchanged. */
  public static final String REFRESH_TOKEN_REUSE = "REFRESH_TOKEN_REUSE";

  public static final String REFRESH_TOKEN = "REFRESH_TOKEN";

  private final AuditEventRepository events;

  public AuditLog(AuditEventRepository events) {
    this.events = events;
  }

  public void record(
      String action, UUID actorId, String actorIp, String entityType, UUID entityId) {
    AuditEvent event = new AuditEvent();
    event.setAction(action);
    event.setActorId(actorId);
    event.setActorIp(actorIp);
    event.setEntityType(entityType);
    event.setEntityId(entityId);
    events.save(event);
  }
}
