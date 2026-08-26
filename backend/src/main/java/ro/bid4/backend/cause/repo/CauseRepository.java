package ro.bid4.backend.cause.repo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;

public interface CauseRepository
    extends JpaRepository<Cause, UUID>, JpaSpecificationExecutor<Cause> {

  List<Cause> findAllByIdIn(Collection<UUID> ids);

  Optional<Cause> findBySlug(String slug);

  List<Cause> findByStatusInOrderByCreatedAtDesc(Collection<CauseStatus> statuses);

  List<Cause> findByOrganizerIdOrderByCreatedAtDesc(UUID organizerId);

  long countByOrganizerIdAndStatusIn(UUID organizerId, Collection<CauseStatus> statuses);
}
