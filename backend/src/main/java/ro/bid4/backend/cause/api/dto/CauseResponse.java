package ro.bid4.backend.cause.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.cause.domain.BeneficiaryType;
import ro.bid4.backend.cause.domain.CauseDocumentKind;
import ro.bid4.backend.cause.domain.CauseEvidenceType;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.domain.GuardianRelation;
import ro.bid4.backend.cause.domain.PayoutMethod;
import ro.bid4.backend.cause.domain.VerificationStatus;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;

public record CauseResponse(
    UUID id,
    String name,
    String slug,
    String shortDescription,
    String story,
    String category,
    String imageUrl,
    String coverUrl,
    List<String> gallery,
    UUID organizerId,
    CauseStatus status,
    ValidationResponse validation,
    BeneficiaryType beneficiaryType,
    BeneficiaryResponse beneficiary,
    GuardianResponse guardian,
    NgoResponse ngo,
    List<EvidenceResponse> documents,
    PayoutResponse payout,
    VerificationResponse verification,
    ConsentsResponse consents,
    long goalAmount,
    long raisedAmount,
    int supporterCount,
    Instant deadline,
    String rejectionReason,
    Instant createdAt,
    Instant submittedAt,
    Instant approvedAt,
    PublicUserResponse organizer,
    int activeAuctionCount) {
  public record ValidationResponse(
      String legalName,
      String registrationNumber,
      String representativeName,
      String contactEmail,
      String contactPhone,
      String website,
      List<DocumentResponse> documents,
      String payoutAccountRef) {}

  public record DocumentResponse(
      UUID id,
      CauseDocumentKind kind,
      String fileName,
      String fileUrl,
      long sizeBytes,
      Instant uploadedAt) {}

  public record BeneficiaryResponse(
      String fullName,
      String contactEmail,
      String contactPhone,
      String county,
      String city,
      Integer age) {}

  public record GuardianResponse(String fullName, GuardianRelation relationToMinor, String phone) {}

  public record NgoResponse(
      String legalName, String registrationNumber, String representativeName) {}

  public record EvidenceResponse(
      UUID id, CauseEvidenceType type, String fileName, String fileRef, String note) {}

  public record PayoutResponse(PayoutMethod method, String iban, boolean stripeOnboarded) {}

  public record VerificationResponse(VerificationStatus status, Long cap, String rejectionReason) {}

  public record ConsentsResponse(
      boolean truthfulness,
      boolean controlledRelease,
      boolean terms,
      Boolean guardianAuthority,
      Instant acceptedAt) {}
}
