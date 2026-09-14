package ro.bid4.backend.cause.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@Entity
@Table(name = "causes")
public class Cause {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "organizer_id", nullable = false)
  private UUID organizerId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String slug;

  @Column(name = "short_description", nullable = false)
  private String shortDescription;

  @Column(nullable = false)
  private String story = "";

  @Column(nullable = false)
  private String category;

  @Column(name = "image_url", nullable = false)
  private String imageUrl = "";

  @Column(name = "cover_url", nullable = false)
  private String coverUrl = "";

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "cause_images", joinColumns = @JoinColumn(name = "cause_id"))
  @OrderColumn(name = "sort_order")
  @Column(name = "url", nullable = false, length = 8192)
  @BatchSize(size = 64)
  private List<String> gallery = new ArrayList<>();

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CauseStatus status = CauseStatus.DRAFT;

  @Column(name = "goal_amount", nullable = false)
  private long goalAmount;

  @Column(name = "raised_amount", nullable = false)
  private long raisedAmount = 0L;

  @Column(name = "supporter_count", nullable = false)
  private int supporterCount = 0;

  private Instant deadline;

  @Column(name = "legal_name", nullable = false)
  private String legalName = "";

  @Column(name = "registration_number", nullable = false)
  private String registrationNumber = "";

  @Column(name = "representative_name", nullable = false)
  private String representativeName = "";

  @Column(name = "contact_email", nullable = false)
  private String contactEmail = "";

  @Column(name = "contact_phone", nullable = false)
  private String contactPhone = "";

  private String website;

  @Column(name = "payout_account_ref", nullable = false)
  private String payoutAccountRef = "";

  @Enumerated(EnumType.STRING)
  @Column(name = "beneficiary_type", nullable = false)
  private BeneficiaryType beneficiaryType = BeneficiaryType.INDIVIDUAL;

  @Column(name = "beneficiary_full_name", nullable = false)
  private String beneficiaryFullName = "";

  @Column(name = "beneficiary_contact_email", nullable = false)
  private String beneficiaryContactEmail = "";

  @Column(name = "beneficiary_contact_phone", nullable = false)
  private String beneficiaryContactPhone = "";

  @Column(name = "beneficiary_county", nullable = false)
  private String beneficiaryCounty = "";

  @Column(name = "beneficiary_city", nullable = false)
  private String beneficiaryCity = "";

  @Column(name = "beneficiary_age")
  private Integer beneficiaryAge;

  @Column(name = "guardian_full_name")
  private String guardianFullName;

  @Enumerated(EnumType.STRING)
  @Column(name = "guardian_relation")
  private GuardianRelation guardianRelation;

  @Column(name = "guardian_phone")
  private String guardianPhone;

  @Column(name = "ngo_legal_name")
  private String ngoLegalName;

  @Column(name = "ngo_registration_number")
  private String ngoRegistrationNumber;

  @Column(name = "ngo_representative_name")
  private String ngoRepresentativeName;

  @Enumerated(EnumType.STRING)
  @Column(name = "payout_method", nullable = false)
  private PayoutMethod payoutMethod = PayoutMethod.STRIPE_INDIVIDUAL;

  @Column(name = "payout_iban")
  private String payoutIban;

  @Column(name = "payout_stripe_onboarded", nullable = false)
  private boolean payoutStripeOnboarded = false;

  @Enumerated(EnumType.STRING)
  @Column(name = "verification_status", nullable = false)
  private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

  @Column(name = "verification_cap")
  private Long verificationCap;

  @Column(name = "verification_rejection")
  private String verificationRejection;

  @Column(name = "consent_truthfulness", nullable = false)
  private boolean consentTruthfulness = false;

  @Column(name = "consent_controlled_release", nullable = false)
  private boolean consentControlledRelease = false;

  @Column(name = "consent_terms", nullable = false)
  private boolean consentTerms = false;

  @Column(name = "consent_guardian_authority")
  private Boolean consentGuardianAuthority;

  @Column(name = "consents_accepted_at")
  private Instant consentsAcceptedAt;

  @Column(name = "rejection_reason")
  private String rejectionReason;

  @Column(name = "submitted_at")
  private Instant submittedAt;

  @Column(name = "approved_at")
  private Instant approvedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof Cause that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
