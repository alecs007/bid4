package ro.bid4.backend.common.audit.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.common.audit.domain.AuditEvent;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {}
