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
