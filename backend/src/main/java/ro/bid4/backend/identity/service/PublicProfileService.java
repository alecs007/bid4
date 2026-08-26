package ro.bid4.backend.identity.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.identity.api.dto.PublicProfileResponse;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserStatus;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/** The public half of someone's account, by the handle their profile URL is built from. */
@Service
@Transactional(readOnly = true)
public class PublicProfileService {

  private static final Set<AuctionStatus> RUNNING =
      Set.of(AuctionStatus.LIVE, AuctionStatus.SCHEDULED);

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
