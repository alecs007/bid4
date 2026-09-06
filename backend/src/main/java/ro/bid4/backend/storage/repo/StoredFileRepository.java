package ro.bid4.backend.storage.repo;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

  /**
   * The ones among these that the caller may attach to something of theirs.
   *
   * <p>Owner and visibility are part of the query rather than checked afterwards, so a listing
   * cannot be built out of somebody else's uploads or out of an identity document — the row simply
   * does not come back. One lookup for the whole set, because a listing carries up to eight.
   */
  List<StoredFile> findByIdInAndOwnerIdAndVisibility(
      Collection<UUID> ids, UUID ownerId, Visibility visibility);
}
