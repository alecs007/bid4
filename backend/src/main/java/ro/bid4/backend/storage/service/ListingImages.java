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

/**
 * Turns the refs a seller submits into the images a listing may keep.
 *
 * <p>An upload endpoint that answers with an id, and a create endpoint that accepts one, is two
 * requests with a gap between them — and the gap is where somebody sends an id that is not theirs.
 * The ids are looked up as a set that must belong to this seller and must be listing imagery, so a
 * ref belonging to another account, or to an identity document, does not come back and the listing
 * is refused rather than quietly built with fewer photographs.
 *
 * <p>The order the seller chose is the order the listing keeps: the first photograph is the cover,
 * and it is the cover because of where it sits.
 */
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
        // The only thing a listing may carry is a ref this application issued.
        // Anything else is an address somebody chose, and an address somebody
        // chose is how a page ends up loading a picture from anywhere at all.
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
