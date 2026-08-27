package ro.bid4.backend.cause.service;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.cause.api.dto.CauseResponse;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.text.SearchTerms;
import ro.bid4.backend.common.web.Viewer;

/**
 * Reading causes.
 *
 * <p>As with auctions, visibility is decided per row rather than per route: a draft or a rejected
 * application belongs to its organiser and to staff, and asking for one by slug must look the same
 * as asking for one that never existed.
 */
@Service
@Transactional(readOnly = true)
public class CauseService {

  private static final int DEFAULT_LIST_SIZE = 60;
  private static final int MAX_LIST_SIZE = 200;
  private static final int TRENDING_COUNT = 3;

  /**
   * How many public causes the trending row ranks over.
   *
   * <p>Ranking happens in memory, so it needs a ceiling that does not grow with the platform.
   */
  private static final int TRENDING_WINDOW = 200;

  private final CauseRepository causes;
  private final CauseMapper mapper;

  public CauseService(CauseRepository causes, CauseMapper mapper) {
    this.causes = causes;
    this.mapper = mapper;
  }

  /**
   * GET /causes
   *
   * <p>A plain list rather than a page, because that is what lib/api/causes.ts declares and the
   * filter bar on /cauze consumes it directly. Bounded all the same: the ceiling is applied here
   * rather than left to however many causes exist.
   */
  public List<CauseResponse> list(String q, List<String> categories, Integer limit, Viewer viewer) {

    List<Specification<Cause>> filters = new ArrayList<>();
    filters.add((root, query, cb) -> root.get("status").in(CauseStatus.PUBLIC));
    if (categories != null && !categories.isEmpty()) {
      filters.add((root, query, cb) -> root.get("category").in(categories));
    }
    if (!SearchTerms.words(q).isEmpty()) {
      filters.add(matchesText(q));
    }

    int size = limit == null ? DEFAULT_LIST_SIZE : Math.min(limit, MAX_LIST_SIZE);

    Page<Cause> found =
        causes.findAll(
            Specification.allOf(filters),
            PageRequest.of(
                0,
                size,
                // Ties broken by id, so the order is stable between calls.
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id"))));

    return mapper.toCards(found.getContent(), viewer);
  }

  /** GET /causes/{idOrSlug} — the page is reachable by either. */
  public CauseResponse get(String idOrSlug, Viewer viewer) {
    Cause cause =
        asUuid(idOrSlug)
            .flatMap(causes::findById)
            .or(() -> causes.findBySlug(idOrSlug))
            .orElseThrow(() -> ApiException.notFound("Cauza"));

    if (!isVisible(cause, viewer)) {
      throw ApiException.notFound("Cauza");
    }
    return mapper.toResponse(cause, viewer);
  }

  /**
   * GET /causes/trending — the homepage row.
   *
   * <p>Closest to a milestone rather than newest: finishing something beats starting everything,
   * and a cause with momentum is the one a visitor can actually push over the line.
   */
  public List<CauseResponse> trending(Viewer viewer) {
    Page<Cause> window =
        causes.findAll(
            Specification.allOf(
                List.of((root, query, cb) -> root.get("status").in(CauseStatus.PUBLIC))),
            PageRequest.of(0, TRENDING_WINDOW, Sort.by(Sort.Direction.DESC, "raisedAmount")));

    List<Cause> ranked =
        window.getContent().stream()
            .filter(cause -> progressPercent(cause) < 100)
            .sorted(Comparator.comparingDouble(CauseService::momentum).reversed())
            .limit(TRENDING_COUNT)
            .toList();

    return mapper.toCards(ranked, viewer);
  }

  /** GET /users/me/causes — any status, including drafts and rejections. */
  public List<CauseResponse> mine(Viewer viewer) {
    if (viewer.isAnonymous()) {
      return List.of();
    }
    return mapper.toCards(causes.findByOrganizerIdOrderByCreatedAtDesc(viewer.id()), viewer);
  }

  private static boolean isVisible(Cause cause, Viewer viewer) {
    return cause.getStatus().isPublic() || viewer.staff() || viewer.is(cause.getOrganizerId());
  }

  /** Free text over the name, the summary and the story, folded the same way both sides fold it. */
  private static Specification<Cause> matchesText(String term) {
    List<String> words = SearchTerms.words(term);
    return (root, query, cb) -> {
      List<Predicate> perWord = new ArrayList<>(words.size());
      for (String word : words) {
        String pattern = SearchTerms.containsPattern(word);
        perWord.add(
            cb.or(
                cb.like(folded(cb, root.get("name")), pattern, SearchTerms.LIKE_ESCAPE),
                cb.like(folded(cb, root.get("shortDescription")), pattern, SearchTerms.LIKE_ESCAPE),
                cb.like(folded(cb, root.get("story")), pattern, SearchTerms.LIKE_ESCAPE)));
      }
      return cb.and(perWord.toArray(Predicate[]::new));
    };
  }

  private static Expression<String> folded(CriteriaBuilder cb, Expression<?> column) {
    return cb.lower(cb.function("unaccent", String.class, column));
  }

  private static double progressPercent(Cause cause) {
    if (cause.getGoalAmount() <= 0) {
      return 0;
    }
    return Math.min(100d, cause.getRaisedAmount() * 100d / cause.getGoalAmount());
  }

  /** Some progress plus supporters beats either alone. */
  private static double momentum(Cause cause) {
    return progressPercent(cause) * 0.6 + cause.getSupporterCount() * 0.05;
  }

  private static Optional<UUID> asUuid(String value) {
    try {
      return Optional.of(UUID.fromString(value));
    } catch (IllegalArgumentException ex) {
      // A slug, not an id. Not an error: the route accepts both.
      return Optional.empty();
    }
  }
}
