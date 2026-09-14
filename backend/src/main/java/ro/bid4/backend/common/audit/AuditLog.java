package ro.bid4.backend.common.audit;

import java.util.UUID;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.audit.domain.AuditEvent;
import ro.bid4.backend.common.audit.repo.AuditEventRepository;

@Service
public class AuditLog {
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
