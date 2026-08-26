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
import ro.bid4.backend.TestcontainersConfiguration;

/**
 * The limiter, with a budget small enough to exhaust in a test.
 *
 * <p>What matters is that the refusal happens before the password is even checked: guessing has to
 * become expensive at the door, not after bcrypt has already been paid for.
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

  @Test
  @DisplayName("the fourth sign-in attempt in the window is refused with 429 and a retry hint")
  void authBudgetIsExhausted() throws Exception {
    String body =
        """
        {"email":"nobody-%s@bid4.ro","password":"orice-parola"}
        """
            .formatted(UUID.randomUUID());

    // Three attempts are within budget. They fail on credentials, which is a
    // different refusal from running out of budget.
    for (int attempt = 1; attempt <= 3; attempt++) {
      mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
          .andExpect(header().exists("X-RateLimit-Remaining"));
    }

    mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
        .andExpect(jsonPath("$.status").value(429))
        .andExpect(header().exists("Retry-After"))
        .andExpect(header().string("X-RateLimit-Remaining", "0"));
  }
}
