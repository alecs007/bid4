package ro.bid4.backend.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import ro.bid4.backend.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, MailCaptureConfiguration.class})
@TestPropertySource(
    properties = {
      "bid4.rate-limit.enabled=false",
      "bid4.verification.resend-cooldown=0s",
      "bid4.jwt.absolute-refresh-ttl=90d"
    })
class RefreshTokenLifetimeTest {
  private static final String PASSWORD = "parola-buna-123";

  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate jdbc;

  @Test
  @DisplayName("a chain older than the absolute ceiling is refused however recently it rotated")
  void agedFamilyIsRefused() throws Exception {
    String email = "lifetime-" + UUID.randomUUID() + "@bid4.ro";
    MvcResult login = registerVerifiedAndLogin(email, "Vechime Test");
    UUID userId = UUID.fromString(userIdOf(login));

    Cookie rotated =
        mvc.perform(post("/auth/refresh").cookie(login.getResponse().getCookie("bid4.refresh")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("bid4.refresh");
    assertThat(rotated).isNotNull();

    assertThat(ageFamilyPastTheCeiling(userId)).isPositive();

    mvc.perform(post("/auth/refresh").cookie(rotated))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));

    assertThat(liveTokenCount(userId)).isZero();
  }

  @Test
  @DisplayName("signing in again starts a new chain rather than inheriting the old one")
  void signingInStartsAFreshFamily() throws Exception {
    String email = "lifetime-" + UUID.randomUUID() + "@bid4.ro";
    UUID userId = UUID.fromString(userIdOf(registerVerifiedAndLogin(email, "Reinceput Test")));
    ageFamilyPastTheCeiling(userId);

    Cookie fresh =
        mvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody(email)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("bid4.refresh");
    assertThat(fresh).isNotNull();

    mvc.perform(post("/auth/refresh").cookie(fresh)).andExpect(status().isOk());
  }

  @Test
  @DisplayName("a refused refresh clears the cookies instead of leaving them behind")
  void refusalClearsBothCookies() throws Exception {
    mvc.perform(post("/auth/refresh").cookie(new Cookie("bid4.refresh", "nu-a-fost-emis")))
        .andExpect(status().isUnauthorized())
        .andExpect(cookie().maxAge("bid4.refresh", 0))
        .andExpect(cookie().maxAge("bid4.session", 0));
  }

  private int ageFamilyPastTheCeiling(UUID userId) {
    return jdbc.update(
        "update refresh_tokens set family_started_at = family_started_at - interval '100 days'"
            + " where user_id = ?",
        userId);
  }

  private int liveTokenCount(UUID userId) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from refresh_tokens"
                + " where user_id = ? and revoked_at is null and rotated_to is null",
            Integer.class,
            userId);
    return count == null ? 0 : count;
  }

  private MvcResult registerVerifiedAndLogin(String email, String displayName) throws Exception {
    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","password":"%s","displayName":"%s",
                     "accountType":"INDIVIDUAL","acceptedTerms":true}
                    """
                        .formatted(email, PASSWORD, displayName)))
        .andExpect(status().isCreated());

    mvc.perform(
            post("/auth/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"token":"%s"}
                    """
                        .formatted(MailCaptureConfiguration.awaitTokenFor(email))))
        .andExpect(status().isNoContent());

    return mvc.perform(
            post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody(email)))
        .andExpect(status().isOk())
        .andReturn();
  }

  private static String loginBody(String email) {
    return """
        {"email":"%s","password":"%s"}
        """
        .formatted(email, PASSWORD);
  }

  private static String userIdOf(MvcResult result) throws Exception {
    String body = result.getResponse().getContentAsString();
    int start = body.indexOf("\"id\":\"") + 6;
    return body.substring(start, body.indexOf('"', start));
  }
}
