package ro.bid4.backend.storage.repo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {
  List<StoredFile> findByIdInAndOwnerIdAndVisibility(
      Collection<UUID> ids, UUID ownerId, Visibility visibility);
}
