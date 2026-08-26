package ro.bid4.backend.common.web;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * The paged shape the frontend consumes — {@code Page<T>} in frontend/src/lib/types/common.ts.
 *
 * <p>Spring Data's own {@code PageImpl} serialises to a different, unstable structure and Boot
 * warns about returning it directly. This is the boundary type, and pages are converted here rather
 * than in every controller.
 */
public record PageResponse<T>(List<T> items, int page, int pageSize, long total, int totalPages) {

  /** Page numbers are 1-based on the wire; Spring Data counts from 0. */
  public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
    return new PageResponse<>(
        page.getContent().stream().map(mapper).toList(),
        page.getNumber() + 1,
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
  }

  public static <T> PageResponse<T> of(List<T> items, int page, int pageSize, long total) {
    int totalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) total / pageSize);
    return new PageResponse<>(items, page, pageSize, total, totalPages);
  }
}
