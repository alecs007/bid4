package ro.bid4.backend.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * <p>Rate limiting is off here so that one test's requests cannot exhaust the next one's budget;
 * RateLimitTest turns it on deliberately and asserts it works.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
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

  private MvcResult register(String email, String displayName) throws Exception {
    return mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(email, displayName, true)))
        .andExpect(status().isCreated())
        .andReturn();
  }

  @Test
  @DisplayName("register returns the AuthSession shape the frontend expects")
  void registerReturnsSession() throws Exception {
    String email = freshEmail();

    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody(email, "Maria Ionescu", true)))
        .andExpect(status().isCreated())
        // AuthSession: { user, token, expiresAt }
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.expiresAt").isNotEmpty())
        .andExpect(jsonPath("$.user.id").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value(email))
        .andExpect(jsonPath("$.user.displayName").value("Maria Ionescu"))
        .andExpect(jsonPath("$.user.username").value("maria-ionescu"))
        .andExpect(jsonPath("$.user.role").value("USER"))
        .andExpect(jsonPath("$.user.accountType").value("INDIVIDUAL"))
        .andExpect(jsonPath("$.user.status").value("ACTIVE"))
        .andExpect(jsonPath("$.user.stripeReady").value(false))
        .andExpect(jsonPath("$.user.hasPaymentMethod").value(false))
        .andExpect(jsonPath("$.user.totalRaised").value(0))
        // The password must not come back in any form.
        .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.user.tokenVersion").doesNotExist())
        // The refresh token is a cookie the page cannot read, never a body field.
        .andExpect(jsonPath("$.refreshToken").doesNotExist())
        .andExpect(cookie().httpOnly("bid4.refresh", true))
        .andExpect(header().exists("X-Request-Id"));
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
        .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"))
        .andExpect(jsonPath("$.status").value(400));
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
        .andExpect(jsonPath("$.trace").doesNotExist())
        .andExpect(jsonPath("$.exception").doesNotExist());
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

  @Test
  @DisplayName("login returns a session for the right password")
  void loginSucceeds() throws Exception {
    String email = freshEmail();
    register(email, "Andrei Popescu");

    mvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","password":"%s"}
                    """
                        .formatted(email, PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value(email));
  }

  @Test
  @DisplayName("a wrong password and an unknown address are indistinguishable")
  void loginFailuresLookIdentical() throws Exception {
    String email = freshEmail();
    register(email, "Ioana Marin");

    String wrongPassword =
        mvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"%s","password":"gresita-total"}
                        """
                            .formatted(email)))
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String unknownAccount =
        mvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"%s","password":"gresita-total"}
                        """
                            .formatted(freshEmail())))
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();

    // Byte-identical: nothing here tells an attacker which addresses exist.
    assertThat(wrongPassword).isEqualTo(unknownAccount);
    assertThat(wrongPassword).contains("INVALID_CREDENTIALS");
  }

  @Test
  @DisplayName("the account locks after the configured number of wrong passwords")
  void accountLocksOut() throws Exception {
    String email = freshEmail();
    register(email, "Blocat Temporar");

    String wrong =
        """
        {"email":"%s","password":"gresita-total"}
        """
            .formatted(email);

    for (int attempt = 0; attempt < 5; attempt++) {
      mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
          .andExpect(status().isUnauthorized());
    }

    // Even the correct password is refused while the lock stands.
    mvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","password":"%s"}
                    """
                        .formatted(email, PASSWORD)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
  }

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
    MvcResult registered = register(email, "Elena Radu");
    String token = tokenOf(registered);

    mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.displayName").value("Elena Radu"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  @DisplayName("a refresh cookie buys a new access token, and the old cookie is rotated")
  void refreshRotates() throws Exception {
    MvcResult registered = register(freshEmail(), "Rotire Test");
    jakarta.servlet.http.Cookie refreshCookie = registered.getResponse().getCookie("bid4.refresh");
    assertThat(refreshCookie).isNotNull();

    MvcResult refreshed =
        mvc.perform(post("/auth/refresh").cookie(refreshCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();

    assertThat(refreshed.getResponse().getCookie("bid4.refresh").getValue())
        .isNotEqualTo(refreshCookie.getValue());

    // Presenting the spent cookie again is treated as theft, not as a retry.
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
