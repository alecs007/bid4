package ro.bid4.backend.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import ro.bid4.backend.TestcontainersConfiguration;

/**
 * The auth surface as the frontend sees it.
 *
 * <p>Rate limiting is off here so one test's requests cannot exhaust the next one's budget;
 * RateLimitTest turns it on deliberately.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, MailCaptureConfiguration.class})
@TestPropertySource(
    properties = {
      "bid4.rate-limit.enabled=false",
      // The cooldown is a real control and has its own test; here it would only
      // stop this class from exercising what a resend actually does.
      "bid4.verification.resend-cooldown=0s"
    })
class AuthEndpointsTest {

  private static final String PASSWORD = "parola-buna-123";

  @Autowired private MockMvc mvc;

  private static String freshEmail() {
    return "test-" + UUID.randomUUID() + "@bid4.ro";
  }

  private static String registerBody(String email, String displayName, boolean terms) {
    return """
        {"email":"%s","password":"%s","displayName":"%s",
         "accountType":"INDIVIDUAL","acceptedTerms":%s}
        """
        .formatted(email, PASSWORD, displayName, terms);
  }

  private static String loginBody(String email, String password) {
    return """
        {"email":"%s","password":"%s"}
        """
        .formatted(email, password);
  }

  private void register(String email, String displayName) throws Exception {
    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(email, displayName, true)))
        .andExpect(status().isCreated());
  }

  /** Registers, redeems the emailed link, signs in, and returns the session response. */
  private MvcResult registerVerifiedAndLogin(String email, String displayName) throws Exception {
    register(email, displayName);
    confirm(MailCaptureConfiguration.awaitTokenFor(email));
    return mvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(email, PASSWORD)))
        .andExpect(status().isOk())
        .andReturn();
  }

  private void confirm(String token) throws Exception {
    mvc.perform(
            post("/auth/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"token":"%s"}
                    """
                        .formatted(token)))
        .andExpect(status().isNoContent());
  }

  /* ---- registration ---------------------------------------------------- */

  @Test
  @DisplayName("register returns the user and no session at all")
  void registerReturnsUserWithoutSession() throws Exception {
    String email = freshEmail();

    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(email, "Maria Ionescu", true)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.displayName").value("Maria Ionescu"))
        .andExpect(jsonPath("$.username").value("maria-ionescu"))
        .andExpect(jsonPath("$.role").value("USER"))
        // An address nobody has proved they own is not a session.
        .andExpect(jsonPath("$.token").doesNotExist())
        .andExpect(jsonPath("$.expiresAt").doesNotExist())
        .andExpect(cookie().doesNotExist("bid4.refresh"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist())
        .andExpect(header().exists("X-Request-Id"));

    // Awaiting the address asserts the mail went there; the value asserts it carried a link.
    assertThat(MailCaptureConfiguration.awaitTokenFor(email)).isNotBlank();
  }

  @Test
  @DisplayName("a second account on the same address is refused with EMAIL_TAKEN")
  void duplicateEmailRefused() throws Exception {
    String email = freshEmail();
    register(email, "Prima Persoana");

    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(email, "A Doua Persoana", true)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
  }

  @Test
  @DisplayName("registering without accepting the terms is refused with TERMS_REQUIRED")
  void termsAreRequired() throws Exception {
    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(freshEmail(), "Fara Termeni", false)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("TERMS_REQUIRED"));
  }

  @Test
  @DisplayName("a malformed address comes back as a field error, not a stack trace")
  void validationReportsFields() throws Exception {
    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("not-an-email", "Nume Valid", true)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.fieldErrors.email").isNotEmpty())
        .andExpect(jsonPath("$.trace").doesNotExist());
  }

  @Test
  @DisplayName("markup in a display name is stripped before it is stored")
  void displayNameIsSanitised() throws Exception {
    MvcResult result =
        mvc.perform(
                post("/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(registerBody(freshEmail(), "<script>alert(1)</script>Ana Pop", true)))
            .andExpect(status().isCreated())
            .andReturn();

    String body = result.getResponse().getContentAsString();
    assertThat(body).doesNotContain("<script>").doesNotContain("alert(1)");
    assertThat(body).contains("Ana Pop");
  }

  /* ---- verification ---------------------------------------------------- */

  @Test
  @DisplayName("an unconfirmed address cannot sign in, even with the right password")
  void unverifiedCannotLogIn() throws Exception {
    String email = freshEmail();
    register(email, "Neconfirmat Test");

    mvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(email, PASSWORD)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
  }

  @Test
  @DisplayName("confirming the address then unlocks sign-in")
  void verificationUnlocksLogin() throws Exception {
    MvcResult session = registerVerifiedAndLogin(freshEmail(), "Confirmat Test");

    assertThat(session.getResponse().getContentAsString()).contains("\"token\"");
    assertThat(session.getResponse().getCookie("bid4.refresh")).isNotNull();
  }

  @Test
  @DisplayName("a token that was never issued is refused")
  void unknownTokenRefused() throws Exception {
    mvc.perform(
            post("/auth/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"token":"nu-a-fost-emis-niciodata"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VERIFICATION_LINK_INVALID"));
  }

  @Test
  @DisplayName("visiting the link twice succeeds, because mail clients prefetch")
  void confirmingTwiceIsIdempotent() throws Exception {
    String email = freshEmail();
    register(email, "Prefetch Test");
    String token = MailCaptureConfiguration.awaitTokenFor(email);

    confirm(token);
    confirm(token);
  }

  @Test
  @DisplayName("a new link retires the previous one")
  void reissuingRetiresTheOldLink() throws Exception {
    String email = freshEmail();
    register(email, "Doua Linkuri");
    String first = MailCaptureConfiguration.awaitTokenFor(email);

    mvc.perform(
            post("/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s"}
                    """
                        .formatted(email)))
        .andExpect(status().isNoContent());

    String second = MailCaptureConfiguration.awaitTokenFor(email);
    assertThat(second).isNotEqualTo(first);

    mvc.perform(
            post("/auth/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"token":"%s"}
                    """
                        .formatted(first)))
        .andExpect(status().isBadRequest());

    confirm(second);
  }

  @Test
  @DisplayName("asking to resend for an unknown address says nothing about it")
  void resendDoesNotRevealAccounts() throws Exception {
    mvc.perform(
            post("/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s"}
                    """
                        .formatted(freshEmail())))
        .andExpect(status().isNoContent());
  }

  /* ---- sign-in --------------------------------------------------------- */

  @Test
  @DisplayName("a wrong password and an unknown address are indistinguishable")
  void loginFailuresLookIdentical() throws Exception {
    String email = freshEmail();
    registerVerifiedAndLogin(email, "Ioana Marin");

    String wrongPassword =
        mvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody(email, "gresita-total")))
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String unknownAccount =
        mvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody(freshEmail(), "gresita-total")))
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(wrongPassword).isEqualTo(unknownAccount).contains("INVALID_CREDENTIALS");
  }

  @Test
  @DisplayName("the account locks after the configured number of wrong passwords")
  void accountLocksOut() throws Exception {
    String email = freshEmail();
    registerVerifiedAndLogin(email, "Blocat Temporar");

    for (int attempt = 0; attempt < 5; attempt++) {
      mvc.perform(
              post("/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(loginBody(email, "gresita-total")))
          .andExpect(status().isUnauthorized());
    }

    mvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(email, PASSWORD)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
  }

  /* ---- session --------------------------------------------------------- */

  @Test
  @DisplayName("/auth/me needs a token")
  void meRequiresAuthentication() throws Exception {
    mvc.perform(get("/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
  }

  @Test
  @DisplayName("/auth/me rejects a token that is not ours")
  void meRejectsForgedToken() throws Exception {
    mvc.perform(get("/auth/me").header("Authorization", "Bearer not.a.real.token"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("/auth/me returns the signed-in user")
  void meReturnsUser() throws Exception {
    String email = freshEmail();
    String token = tokenOf(registerVerifiedAndLogin(email, "Elena Radu"));

    mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.displayName").value("Elena Radu"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  @DisplayName("a refresh cookie buys a new access token, and the spent one is theft")
  void refreshRotates() throws Exception {
    MvcResult session = registerVerifiedAndLogin(freshEmail(), "Rotire Test");
    Cookie refreshCookie = session.getResponse().getCookie("bid4.refresh");
    assertThat(refreshCookie).isNotNull();

    MvcResult refreshed =
        mvc.perform(post("/auth/refresh").cookie(refreshCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();

    assertThat(refreshed.getResponse().getCookie("bid4.refresh").getValue())
        .isNotEqualTo(refreshCookie.getValue());

    mvc.perform(post("/auth/refresh").cookie(refreshCookie))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
  }

  private static String tokenOf(MvcResult result) throws Exception {
    String body = result.getResponse().getContentAsString();
    int start = body.indexOf("\"token\":\"") + 9;
    return body.substring(start, body.indexOf('"', start));
  }
}
