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

/**
 * A cause: who is being helped, why, and how far along it is.
 *
 * <p>A cause may be raised for a private person rather than an organisation, which is why the
 * validation block sits at the centre of it — an NGO can be checked against a register and a person
 * cannot, so what stands in for that check is the paperwork and the operator who read it.
 *
 * <p>{@code category} is a String rather than an enum: the TypeScript union is lower-case ids, an
 * enum would either spell its constants in lower case or need a converter on both the JPA and the
 * Jackson side, and the CHECK constraint already refuses anything outside the set.
 */
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

  /** Long-form, shown on the cause's own page. */
  @Column(nullable = false)
  private String story = "";

  @Column(nullable = false)
  private String category;

  /** The card image. */
  @Column(name = "image_url", nullable = false)
  private String imageUrl = "";

  /** The hero image at the top of the page. */
  @Column(name = "cover_url", nullable = false)
  private String coverUrl = "";

  /**
   * Further photographs, in the order the organiser put them.
   *
   * <p>Ordered because a cause is told through its pictures and which one comes first is an
   * editorial decision, not an accident of insertion. Batched so a page of cause cards costs one
   * extra query rather than one per card.
   */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "cause_images", joinColumns = @JoinColumn(name = "cause_id"))
  @OrderColumn(name = "sort_order")
  @Column(name = "url", nullable = false, length = 8192)
  @BatchSize(size = 64)
  private List<String> gallery = new ArrayList<>();

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CauseStatus status = CauseStatus.DRAFT;

  /** Integer bani. Never a floating point type. */
  @Column(name = "goal_amount", nullable = false)
  private long goalAmount;

  @Column(name = "raised_amount", nullable = false)
  private long raisedAmount = 0L;

  /** Orders that have released money to this cause. */
  @Column(name = "supporter_count", nullable = false)
  private int supporterCount = 0;

  private Instant deadline;

  /* --- the validation block --------------------------------------------- */

  @Column(name = "legal_name", nullable = false)
  private String legalName = "";

  /** CUI for an organisation; empty for a private individual. */
  @Column(name = "registration_number", nullable = false)
  private String registrationNumber = "";

  @Column(name = "representative_name", nullable = false)
  private String representativeName = "";

  @Column(name = "contact_email", nullable = false)
  private String contactEmail = "";

  @Column(name = "contact_phone", nullable = false)
  private String contactPhone = "";

  private String website;

  /** Masked before it leaves the application. Staff views see the whole of it. */
  @Column(name = "payout_account_ref", nullable = false)
  private String payoutAccountRef = "";

  /* --- who the money is for ---------------------------------------------- */

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

  /** MINOR only, and the reason the guardian fields below are required. */
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

  /* --- where released donations land -------------------------------------- */

  @Enumerated(EnumType.STRING)
  @Column(name = "payout_method", nullable = false)
  private PayoutMethod payoutMethod = PayoutMethod.STRIPE_INDIVIDUAL;

  /** Masked before it leaves the application. */
  @Column(name = "payout_iban")
  private String payoutIban;

  @Column(name = "payout_stripe_onboarded", nullable = false)
  private boolean payoutStripeOnboarded = false;

  /* --- how far the checking has got ---------------------------------------- */

  @Enumerated(EnumType.STRING)
  @Column(name = "verification_status", nullable = false)
  private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

  /** What the cause may raise before verification completes. */
  @Column(name = "verification_cap")
  private Long verificationCap;

  @Column(name = "verification_rejection")
  private String verificationRejection;

  /* --- what the organiser signed ------------------------------------------- */

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

  /* --- the operator's decision -------------------------------------------- */

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
