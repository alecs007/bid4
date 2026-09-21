package ro.bid4.backend.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import ro.bid4.backend.TestcontainersConfiguration;
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
class DeliveryMethodTest {
  @Autowired private MockMvc mvc;
  @Autowired private JwtService tokens;
  @Autowired private UserAccountRepository users;

  @Test
  @DisplayName("the first delivery method becomes the default, and a later one does not")
  void theFirstMethodIsTheDefault() throws Exception {
    UserAccount buyer = user();

    mvc.perform(
            post("/users/me/delivery-methods")
                .header(HttpHeaders.AUTHORIZATION, bearer(buyer))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"type":"EASYBOX","easyboxLockerId":"CLJ-058",
                     "lockerName":"Easybox Kaufland Mărăști",
                     "lockerAddress":"Str. Fabricii de Zahăr 5, Cluj-Napoca",
                     "phone":"0722000000","isDefault":false}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.isDefault").value(true))
        .andExpect(jsonPath("$.label").value("Easybox Kaufland Mărăști"));

    mvc.perform(
            post("/users/me/delivery-methods")
                .header(HttpHeaders.AUTHORIZATION, bearer(buyer))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"type":"HOME_COURIER",
                     "homeAddress":{"recipientName":"Ana Pop","street":"Str. Lungă 3",
                                    "city":"Brașov","county":"Brașov","postalCode":"500000"},
                     "phone":"0722000001","isDefault":false}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.isDefault").value(false))
        .andExpect(jsonPath("$.homeAddress.street").value("Str. Lungă 3"));

    mvc.perform(get("/users/me/delivery-methods").header(HttpHeaders.AUTHORIZATION, bearer(buyer)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].isDefault").value(true));

    assertThat(users.findById(buyer.getId()).orElseThrow().getDefaultDeliveryMethodId())
        .isNotNull();
  }

  @Test
  @DisplayName("an address without a street is refused")
  void anIncompleteAddressIsRefused() throws Exception {
    mvc.perform(
            post("/users/me/delivery-methods")
                .header(HttpHeaders.AUTHORIZATION, bearer(user()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"type":"HOME_COURIER",
                     "homeAddress":{"recipientName":"Ana Pop","city":"Brașov","county":"Brașov"},
                     "phone":"0722000001"}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("lockers are found by city, with or without diacritics")
  void lockersAreSearchable() throws Exception {
    mvc.perform(
            get("/shipping/lockers")
                .param("q", "timisoara")
                .header(HttpHeaders.AUTHORIZATION, bearer(user())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].id").value("TIM-021"));
  }

  private UserAccount user() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("delivery-" + suffix + "@bid4.ro");
    account.setDisplayName("Livrare Test");
    account.setUsername("delivery-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    return users.save(account);
  }

  private String bearer(UserAccount account) {
    return "Bearer " + tokens.issueAccessToken(account).value();
  }
}
