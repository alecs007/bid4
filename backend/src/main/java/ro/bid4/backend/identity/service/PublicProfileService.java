package ro.bid4.backend.identity.service;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.text.SearchTerms;
import ro.bid4.backend.identity.api.dto.PublicProfileResponse;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserStatus;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/** The public half of someone's account, by the handle their profile URL is built from. */
@Service
@Transactional(readOnly = true)
public class PublicProfileService {

  /** A search is a search. Without a ceiling this is a downloadable directory. */
  private static final int MAX_SEARCH_RESULTS = 50;

  private static final Set<AuctionStatus> RUNNING =
      Set.of(AuctionStatus.LIVE, AuctionStatus.RESERVED);

  private final UserAccountRepository users;
  private final AuctionRepository auctions;
  private final CauseRepository causes;
  private final UserMapper mapper;

  public PublicProfileService(
      UserAccountRepository users,
      AuctionRepository auctions,
      CauseRepository causes,
      UserMapper mapper) {
    this.users = users;
    this.auctions = auctions;
    this.causes = causes;
    this.mapper = mapper;
  }

  /**
   * Members whose name or handle matches, for the search page.
   *
   * <p>Those two columns and no others. Searching an email address would turn this into a way of
   * asking the platform whether somebody has an account, which is not a stranger's question to put.
   * Suspended accounts are left out for the same reason {@link #byUsername} refuses them: there is
   * no public page to send anyone to.
   *
   * <p>Capped rather than unbounded. A search is a search; without a ceiling, a one-letter term
   * turns a public endpoint into a downloadable member directory.
   */
  public List<PublicUserResponse> search(String term) {
    List<String> words = SearchTerms.words(term);
    if (words.isEmpty()) {
      return List.of();
    }

    Specification<UserAccount> matches =
        (root, query, cb) -> {
          List<Predicate> perWord = new ArrayList<>(words.size());
          for (String word : words) {
            String pattern = SearchTerms.containsPattern(word);
            perWord.add(
                cb.or(
                    cb.like(folded(cb, root.get("displayName")), pattern, SearchTerms.LIKE_ESCAPE),
                    cb.like(folded(cb, root.get("username")), pattern, SearchTerms.LIKE_ESCAPE)));
          }
          return cb.and(
              cb.notEqual(root.get("status"), UserStatus.SUSPENDED),
              cb.and(perWord.toArray(Predicate[]::new)));
        };

    return users
        .findAll(matches, PageRequest.of(0, MAX_SEARCH_RESULTS, Sort.by("displayName")))
        .map(mapper::toPublicUser)
        .getContent();
  }

  /** Folded the same way the column is, so the two agree about diacritics. */
  private static Expression<String> folded(CriteriaBuilder cb, Expression<?> column) {
    return cb.lower(cb.function("unaccent", String.class, column));
  }

  public PublicProfileResponse byUsername(String username) {
    UserAccount account =
        users
            .findByUsername(username.toLowerCase(Locale.ROOT))
            .orElseThrow(() -> ApiException.notFound("Profilul"));

    // A suspended account has no public page. Not found rather than forbidden:
    // whether someone was suspended is nobody else's business.
    if (account.getStatus() == UserStatus.SUSPENDED) {
      throw ApiException.notFound("Profilul");
    }

    return new PublicProfileResponse(
        mapper.toPublicUser(account),
        auctions.countBySellerIdAndStatusIn(account.getId(), RUNNING),
        auctions.countBySellerIdAndStatusIn(account.getId(), Set.of(AuctionStatus.SOLD)),
        causes.countByOrganizerIdAndStatusIn(account.getId(), List.copyOf(CauseStatus.PUBLIC)));
  }
}
