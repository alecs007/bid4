package ro.bid4.backend.cause.repo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.cause.domain.CauseDocument;

public interface CauseDocumentRepository extends JpaRepository<CauseDocument, UUID> {
  List<CauseDocument> findByCauseIdInOrderByUploadedAtAsc(Collection<UUID> causeIds);
}
