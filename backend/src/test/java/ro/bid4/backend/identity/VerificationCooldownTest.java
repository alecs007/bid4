package ro.bid4.backend.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, MailCaptureConfiguration.class})
@TestPropertySource(
    properties = {"bid4.rate-limit.enabled=false", "bid4.verification.resend-cooldown=2m"})
class VerificationCooldownTest {
  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("a second link cannot be requested inside the cooldown")
  void resendIsThrottledPerAccount() throws Exception {
    String email = "cooldown-" + UUID.randomUUID() + "@bid4.ro";

    mvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","password":"parola-buna-123","displayName":"Racire Test",
                     "accountType":"INDIVIDUAL","acceptedTerms":true}
                    """
                        .formatted(email)))
        .andExpect(status().isCreated());

    mvc.perform(
            post("/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s"}
                    """
                        .formatted(email)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value("VERIFICATION_RESEND_TOO_SOON"));
  }
}
