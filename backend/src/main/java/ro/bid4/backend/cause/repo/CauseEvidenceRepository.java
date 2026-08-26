package ro.bid4.backend.cause.repo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.cause.domain.CauseEvidence;

public interface CauseEvidenceRepository extends JpaRepository<CauseEvidence, UUID> {

  List<CauseEvidence> findByCauseIdIn(Collection<UUID> causeIds);
}
