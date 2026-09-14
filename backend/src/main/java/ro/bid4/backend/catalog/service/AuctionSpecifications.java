package ro.bid4.backend.catalog.service;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.common.text.SearchTerms;

final class AuctionSpecifications {
  private AuctionSpecifications() {}

  static Specification<Auction> statusIn(Collection<AuctionStatus> statuses) {
    return (root, query, cb) -> root.get("status").in(statuses);
  }

  static Specification<Auction> categoryIn(Collection<String> categories) {
    return (root, query, cb) -> root.get("category").in(categories);
  }

  static Specification<Auction> conditionIn(Collection<ItemCondition> conditions) {
    return (root, query, cb) -> root.get("condition").in(conditions);
  }

  static Specification<Auction> causeIs(UUID causeId) {
    return (root, query, cb) -> cb.equal(root.get("causeId"), causeId);
  }

  static Specification<Auction> sellerIs(UUID sellerId) {
    return (root, query, cb) -> cb.equal(root.get("sellerId"), sellerId);
  }

  static Specification<Auction> priceAtLeast(long amount) {
    return (root, query, cb) -> cb.greaterThanOrEqualTo(root.<Long>get("currentPrice"), amount);
  }

  static Specification<Auction> priceAtMost(long amount) {
    return (root, query, cb) -> cb.lessThanOrEqualTo(root.<Long>get("currentPrice"), amount);
  }

  static Specification<Auction> donationAtLeast(int percent) {
    return (root, query, cb) ->
        cb.greaterThanOrEqualTo(root.<Short>get("donationPercent"), (short) percent);
  }

  static Specification<Auction> matchesText(String term) {
    List<String> words = SearchTerms.words(term);
    return (root, query, cb) -> {
      List<Predicate> perWord = new ArrayList<>(words.size());
      for (String word : words) {
        String pattern = SearchTerms.containsPattern(word);

        Subquery<UUID> causeMatches = query.subquery(UUID.class);
        Root<Cause> cause = causeMatches.from(Cause.class);
        causeMatches
            .select(cause.get("id"))
            .where(
                cb.equal(cause.get("id"), root.get("causeId")),
                cb.like(folded(cb, cause.get("name")), pattern, SearchTerms.LIKE_ESCAPE));

        perWord.add(
            cb.or(
                cb.like(folded(cb, root.get("title")), pattern, SearchTerms.LIKE_ESCAPE),
                cb.like(folded(cb, root.get("description")), pattern, SearchTerms.LIKE_ESCAPE),
                cb.exists(causeMatches)));
      }
      return cb.and(perWord.toArray(Predicate[]::new));
    };
  }

  private static Expression<String> folded(CriteriaBuilder cb, Expression<?> column) {
    return cb.lower(cb.function("unaccent", String.class, column));
  }
}
