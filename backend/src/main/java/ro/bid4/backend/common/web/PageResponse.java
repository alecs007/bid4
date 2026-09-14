package ro.bid4.backend.common.web;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

public record PageResponse<T>(List<T> items, int page, int pageSize, long total, int totalPages) {
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
