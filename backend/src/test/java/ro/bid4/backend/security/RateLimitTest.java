package ro.bid4.backend.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import ro.bid4.backend.TestcontainersConfiguration;

/**
 * The limiter, with a budget small enough to exhaust in a test.
 *
 * <p>What matters is that the refusal happens before the password is even checked: guessing has to
 * become expensive at the door, not after bcrypt has already been paid for.
 *
 * <p>Each test claims its own client address. An anonymous caller is keyed by address, so tests
 * sharing one would spend each other's budget and fail in whatever order they happened to run.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(
    properties = {
      "bid4.rate-limit.enabled=true",
      "bid4.rate-limit.auth.capacity=3",
      "bid4.rate-limit.auth.window=15m"
    })
class RateLimitTest {

  @Autowired private MockMvc mvc;

  /** A sign-in attempt from a named address, with credentials that will not match. */
  private static MockHttpServletRequestBuilder loginFrom(String address, String email) {
    return post("/auth/login")
        .with(
            request -> {
              request.setRemoteAddr(address);
              return request;
            })
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"%s\",\"password\":\"orice-parola\"}".formatted(email));
  }

  private static String someone() {
    return "nobody-%s@bid4.ro".formatted(UUID.randomUUID());
  }

  @Test
  @DisplayName("the fourth sign-in attempt in the window is refused with 429 and a retry hint")
  void authBudgetIsExhausted() throws Exception {
    String caller = "198.51.100.7";
    String email = someone();

    // Three attempts are within budget. They fail on credentials, which is a
    // different refusal from running out of budget.
    for (int attempt = 1; attempt <= 3; attempt++) {
      mvc.perform(loginFrom(caller, email))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
          .andExpect(header().exists("X-RateLimit-Remaining"));
    }

    mvc.perform(loginFrom(caller, email))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
        .andExpect(jsonPath("$.status").value(429))
        .andExpect(header().exists("Retry-After"))
        .andExpect(header().string("X-RateLimit-Remaining", "0"));
  }

  /**
   * A caller must not be able to mint themselves a fresh budget.
   *
   * <p>X-Forwarded-For is written by whoever sends the request. If the address the limiter keys on
   * can be set from it, guessing a password costs one header per attempt and the budget stops
   * meaning anything — which is the whole defence on this route. This failed under Boot's
   * `framework` forwarded-headers strategy, which rewrites the client address from that header no
   * matter who sent it.
   *
   * <p>Tomcat's valve is what decides this in production, and a MockMvc request never reaches it.
   * So what this pins is the half that lives in our own code: nothing in the filter chain reads
   * that header, and the limiter keys on the connection.
   */
  @Test
  @DisplayName("a made-up X-Forwarded-For does not buy a new budget")
  void forwardedForCannotResetTheBudget() throws Exception {
    String caller = "198.51.100.9";
    String email = someone();

    for (int attempt = 1; attempt <= 3; attempt++) {
      mvc.perform(loginFrom(caller, email).header("X-Forwarded-For", "203.0.113." + attempt))
          .andExpect(status().isUnauthorized());
    }

    mvc.perform(loginFrom(caller, email).header("X-Forwarded-For", "203.0.113.4"))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
  }
}
