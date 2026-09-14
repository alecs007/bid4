package ro.bid4.backend.cause;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.cause.domain.Cause;
import ro.bid4.backend.cause.domain.CauseStatus;
import ro.bid4.backend.cause.repo.CauseRepository;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.security.jwt.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class CauseEndpointsTest {
  private static final long LEU = 100;
  private static final String IBAN = "RO49AAAA1B31007593840000";

  @Autowired private MockMvc mvc;
  @Autowired private UserAccountRepository users;
  @Autowired private CauseRepository causes;
  @Autowired private JwtService tokens;

  private UserAccount organizer;
  private UserAccount stranger;
  private UserAccount staff;

  private Cause active;
  private Cause draft;

  @BeforeAll
  void seedTheWorld() {
    organizer = user("Elena Vasilescu", UserRole.USER);
    stranger = user("Vlad Petrescu", UserRole.USER);
    staff = user("Cristina Dobre", UserRole.OPERATOR);

    active = cause(organizer.getId(), "Operatia Anei", CauseStatus.ACTIVE);
    draft = cause(organizer.getId(), "Inca nu e gata", CauseStatus.DRAFT);
  }

  @Test
  @DisplayName("GET /causes answers a plain list, which is what the filter bar consumes")
  void listIsAnArray() throws Exception {
    mvc.perform(get("/causes"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[?(@.slug == '" + draft.getSlug() + "')]").isEmpty());
  }

  @Test
  @DisplayName("A cause is reachable by slug and by id, and carries its page")
  void reachableByEither() throws Exception {
    mvc.perform(get("/causes/" + active.getSlug()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Operatia Anei"))
        .andExpect(jsonPath("$.gallery").isArray())
        .andExpect(jsonPath("$.story").exists())
        .andExpect(jsonPath("$.organizer.displayName").value("Elena Vasilescu"))
        .andExpect(jsonPath("$.validation.documents").isArray())
        .andExpect(jsonPath("$.beneficiaryType").value("INDIVIDUAL"));

    mvc.perform(get("/causes/" + active.getId())).andExpect(status().isOk());
  }

  @Test
  @DisplayName("A draft belongs to its organiser, and is not found for anyone else")
  void draftsAreInvisible() throws Exception {
    mvc.perform(get("/causes/" + draft.getSlug())).andExpect(status().isNotFound());

    mvc.perform(
            get("/causes/" + draft.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(stranger)))
        .andExpect(status().isNotFound());

    mvc.perform(
            get("/causes/" + draft.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(organizer)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));

    mvc.perform(get("/causes/" + draft.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(staff)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Where the money lands is masked for everyone but the organiser and staff")
  void payoutDetailsAreMasked() throws Exception {
    mvc.perform(get("/causes/" + active.getSlug()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.payout.iban").value("••••0000"))
        .andExpect(jsonPath("$.validation.payoutAccountRef").value("••••0000"))
        .andExpect(jsonPath("$.beneficiary.contactEmail").value(""))
        .andExpect(jsonPath("$.beneficiary.contactPhone").value(""))
        .andExpect(jsonPath("$.validation.contactEmail").value(""));

    mvc.perform(
            get("/causes/" + active.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(stranger)))
        .andExpect(jsonPath("$.payout.iban").value("••••0000"));

    mvc.perform(
            get("/causes/" + active.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(organizer)))
        .andExpect(jsonPath("$.payout.iban").value(IBAN))
        .andExpect(jsonPath("$.beneficiary.contactEmail").value("ana@bid4.ro"));

    mvc.perform(get("/causes/" + active.getSlug()).header(HttpHeaders.AUTHORIZATION, bearer(staff)))
        .andExpect(jsonPath("$.payout.iban").value(IBAN));
  }

  @Test
  @DisplayName("A cause that does not exist reads the same as one that is hidden")
  void unknownIsNotFound() throws Exception {
    mvc.perform(get("/causes/nu-exista-aceasta-cauza")).andExpect(status().isNotFound());
    mvc.perform(get("/causes/" + UUID.randomUUID())).andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Search folds diacritics and treats a wildcard as a character")
  void searchIsFoldedAndEscaped() throws Exception {
    mvc.perform(get("/causes").param("q", "operatia"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].slug").value(active.getSlug()));

    mvc.perform(get("/causes").param("q", "%"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  private UserAccount user(String displayName, UserRole role) {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("cause-" + suffix + "@bid4.ro");
    account.setDisplayName(displayName);
    account.setUsername("cause-" + suffix);
    account.setRole(role);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    return users.save(account);
  }

  private Cause cause(UUID organizerId, String name, CauseStatus status) {
    Cause cause = new Cause();
    cause.setOrganizerId(organizerId);
    cause.setName(name);
    cause.setSlug("cauza-" + UUID.randomUUID().toString().substring(0, 8));
    cause.setShortDescription("Descriere scurtă pentru teste.");
    cause.setStory("Povestea completă a cauzei, pentru pagina ei.");
    cause.setCategory("medical");
    cause.setGallery(List.of("https://example.invalid/1.png", "https://example.invalid/2.png"));
    cause.setStatus(status);
    cause.setGoalAmount(45_000 * LEU);
    cause.setRaisedAmount(12_400 * LEU);
    cause.setPayoutIban(IBAN);
    cause.setPayoutAccountRef(IBAN);
    cause.setContactEmail("ana@bid4.ro");
    cause.setContactPhone("+40740123456");
    cause.setBeneficiaryFullName("Ana Ionescu");
    cause.setBeneficiaryContactEmail("ana@bid4.ro");
    cause.setBeneficiaryContactPhone("+40740123456");
    return causes.save(cause);
  }

  private String bearer(UserAccount account) {
    return "Bearer " + tokens.issueAccessToken(account).value();
  }
}
