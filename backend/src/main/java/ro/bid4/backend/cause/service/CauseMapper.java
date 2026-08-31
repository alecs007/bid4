package ro.bid4.backend.cause.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.cause.api.dto.CauseResponse;
import ro.bid4.backend.cause.api.dto.CauseSummaryResponse;
import ro.bid4.backend.cause.domain.BeneficiaryType;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseDocument;
import ro.bid4.backend.cause.domain.CauseEvidence;
import ro.bid4.backend.cause.repo.CauseDocumentRepository;
import ro.bid4.backend.cause.repo.CauseEvidenceRepository;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
import ro.bid4.backend.identity.service.UserMapper;

/**
 * The one place a cause row becomes a response.
 *
 * <p>The full mapping takes a list, because a cause page carries an organiser, a gallery, its
 * paperwork and a count of live listings, and fetching those per cause turns a page of cards into
 * dozens of queries.
 */
@Component
public class CauseMapper {

  /** A cause is publicly listed and can receive donations in these two states. */
  private static final Set<AuctionStatus> RUNNING =
      Set.of(AuctionStatus.LIVE, AuctionStatus.RESERVED);

  private final CauseRepository causes;
  private final CauseDocumentRepository documents;
  private final CauseEvidenceRepository evidence;
  private final AuctionRepository auctions;
  private final UserMapper users;

  public CauseMapper(
      CauseRepository causes,
      CauseDocumentRepository documents,
      CauseEvidenceRepository evidence,
      AuctionRepository auctions,
      UserMapper users) {
    this.causes = causes;
    this.documents = documents;
    this.evidence = evidence;
    this.auctions = auctions;
    this.users = users;
  }

  /* --- the block that travels inside an auction --------------------------- */

  public CauseSummaryResponse toSummary(Cause cause) {
    return new CauseSummaryResponse(
        cause.getId(),
        cause.getName(),
        cause.getSlug(),
        cause.getShortDescription(),
        cause.getImageUrl(),
        cause.getCategory(),
        cause.getGoalAmount(),
        cause.getRaisedAmount(),
        cause.getStatus());
  }

  /** Loads a whole page's worth of cause blocks at once. */
  public Map<UUID, CauseSummaryResponse> summariesById(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    return causes.findAllByIdIn(ids).stream()
        .collect(Collectors.toMap(Cause::getId, this::toSummary, (first, second) -> first));
  }

  /* --- the cause's own page ------------------------------------------------ */

  /**
   * A row of cause cards: name, imagery, progress, and how many listings are running.
   *
   * <p>Does not read the paperwork. A card shows none of it, and loading the documents and the
   * evidence for a homepage row is two round trips per request spent on data the page will not
   * render. Those arrive with {@link #toResponse}, which is what the cause's own page calls.
   */
  public List<CauseResponse> toCards(List<Cause> loaded, Viewer viewer) {
    return map(loaded, viewer, false);
  }

  /** One cause, with everything its page shows — the paperwork included. */
  public CauseResponse toResponse(Cause cause, Viewer viewer) {
    return map(List.of(cause), viewer, true).getFirst();
  }

  private List<CauseResponse> map(List<Cause> loaded, Viewer viewer, boolean withPaperwork) {
    if (loaded.isEmpty()) {
      return List.of();
    }

    Set<UUID> causeIds = new HashSet<>(loaded.size());
    Set<UUID> organizerIds = new HashSet<>(loaded.size());
    for (Cause cause : loaded) {
      causeIds.add(cause.getId());
      organizerIds.add(cause.getOrganizerId());
    }

    Map<UUID, PublicUserResponse> organizers = users.publicUsersById(organizerIds);

    Map<UUID, List<CauseDocument>> documentsByCause = new HashMap<>();
    Map<UUID, List<CauseEvidence>> evidenceByCause = new HashMap<>();
    if (withPaperwork) {
      for (CauseDocument document : documents.findByCauseIdInOrderByUploadedAtAsc(causeIds)) {
        documentsByCause
            .computeIfAbsent(document.getCauseId(), key -> new ArrayList<>())
            .add(document);
      }
      for (CauseEvidence item : evidence.findByCauseIdIn(causeIds)) {
        evidenceByCause.computeIfAbsent(item.getCauseId(), key -> new ArrayList<>()).add(item);
      }
    }

    Map<UUID, Integer> liveCounts = new HashMap<>();
    for (AuctionRepository.CauseTally tally : auctions.countByCause(causeIds, RUNNING)) {
      liveCounts.put(tally.getCauseId(), (int) tally.getTotal());
    }

    return loaded.stream()
        .map(
            cause ->
                toResponse(
                    cause,
                    organizers.get(cause.getOrganizerId()),
                    documentsByCause.getOrDefault(cause.getId(), List.of()),
                    evidenceByCause.getOrDefault(cause.getId(), List.of()),
                    liveCounts.getOrDefault(cause.getId(), 0),
                    viewer))
        .toList();
  }

  private CauseResponse toResponse(
      Cause cause,
      PublicUserResponse organizer,
      List<CauseDocument> causeDocuments,
      List<CauseEvidence> causeEvidence,
      int activeAuctionCount,
      Viewer viewer) {

    // The organiser and staff are the only readers entitled to the contact
    // details of a beneficiary and to where the money lands.
    boolean privileged = viewer.staff() || viewer.is(cause.getOrganizerId());

    return new CauseResponse(
        cause.getId(),
        cause.getName(),
        cause.getSlug(),
        cause.getShortDescription(),
        cause.getStory(),
        cause.getCategory(),
        cause.getImageUrl(),
        cause.getCoverUrl(),
        List.copyOf(cause.getGallery()),
        cause.getOrganizerId(),
        cause.getStatus(),
        new CauseResponse.ValidationResponse(
            cause.getLegalName(),
            cause.getRegistrationNumber(),
            cause.getRepresentativeName(),
            privileged ? cause.getContactEmail() : "",
            privileged ? cause.getContactPhone() : "",
            cause.getWebsite(),
            causeDocuments.stream().map(CauseMapper::toDocument).toList(),
            mask(cause.getPayoutAccountRef(), privileged)),
        cause.getBeneficiaryType(),
        new CauseResponse.BeneficiaryResponse(
            cause.getBeneficiaryFullName(),
            privileged ? cause.getBeneficiaryContactEmail() : "",
            privileged ? cause.getBeneficiaryContactPhone() : "",
            cause.getBeneficiaryCounty(),
            cause.getBeneficiaryCity(),
            cause.getBeneficiaryAge()),
        guardianOf(cause),
        ngoOf(cause),
        causeEvidence.stream().map(CauseMapper::toEvidence).toList(),
        new CauseResponse.PayoutResponse(
            cause.getPayoutMethod(),
            mask(cause.getPayoutIban(), privileged),
            cause.isPayoutStripeOnboarded()),
        new CauseResponse.VerificationResponse(
            cause.getVerificationStatus(),
            cause.getVerificationCap(),
            cause.getVerificationRejection()),
        new CauseResponse.ConsentsResponse(
            cause.isConsentTruthfulness(),
            cause.isConsentControlledRelease(),
            cause.isConsentTerms(),
            cause.getConsentGuardianAuthority(),
            cause.getConsentsAcceptedAt()),
        cause.getGoalAmount(),
        cause.getRaisedAmount(),
        cause.getSupporterCount(),
        cause.getDeadline(),
        cause.getRejectionReason(),
        cause.getCreatedAt(),
        cause.getSubmittedAt(),
        cause.getApprovedAt(),
        organizer,
        activeAuctionCount);
  }

  private static CauseResponse.GuardianResponse guardianOf(Cause cause) {
    if (cause.getBeneficiaryType() != BeneficiaryType.MINOR
        || cause.getGuardianFullName() == null) {
      return null;
    }
    return new CauseResponse.GuardianResponse(
        cause.getGuardianFullName(), cause.getGuardianRelation(), cause.getGuardianPhone());
  }

  private static CauseResponse.NgoResponse ngoOf(Cause cause) {
    if (cause.getBeneficiaryType() != BeneficiaryType.NGO || cause.getNgoLegalName() == null) {
      return null;
    }
    return new CauseResponse.NgoResponse(
        cause.getNgoLegalName(),
        cause.getNgoRegistrationNumber(),
        cause.getNgoRepresentativeName());
  }

  private static CauseResponse.DocumentResponse toDocument(CauseDocument document) {
    return new CauseResponse.DocumentResponse(
        document.getId(),
        document.getKind(),
        document.getFileName(),
        document.getFileUrl(),
        document.getSizeBytes(),
        document.getUploadedAt());
  }

  private static CauseResponse.EvidenceResponse toEvidence(CauseEvidence item) {
    return new CauseResponse.EvidenceResponse(
        item.getId(), item.getType(), item.getFileName(), item.getFileRef(), item.getNote());
  }

  /**
   * Last four characters, or the whole of it for someone entitled to read it.
   *
   * <p>An account number is shown so its owner can confirm it is the right one, never so a visitor
   * can copy it down.
   */
  private static String mask(String value, boolean privileged) {
    if (value == null || value.isBlank()) {
      return "";
    }
    if (privileged) {
      return value;
    }
    return value.length() <= 4 ? "••••" : "••••" + value.substring(value.length() - 4);
  }
}
