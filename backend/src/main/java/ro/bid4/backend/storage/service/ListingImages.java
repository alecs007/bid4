package ro.bid4.backend.storage.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

@Service
public class ListingImages {
  private final StoredFileRepository files;

  public ListingImages(StoredFileRepository files) {
    this.files = files;
  }

  public List<String> claim(List<String> refs, UUID sellerId) {
    Set<UUID> ids = new LinkedHashSet<>();
    for (String ref : refs) {
      try {
        ids.add(UUID.fromString(ref));
      } catch (IllegalArgumentException notAnId) {
        throw new ApiException(ErrorCode.VALIDATION_FAILED, "Fotografiile nu sunt valide.");
      }
    }

    List<StoredFile> owned =
        files.findByIdInAndOwnerIdAndVisibility(ids, sellerId, Visibility.PUBLIC);
    if (owned.size() != ids.size()) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Fotografiile nu au putut fi găsite. Încarcă-le din nou.");
    }

    return ids.stream().map(UUID::toString).toList();
  }
}
