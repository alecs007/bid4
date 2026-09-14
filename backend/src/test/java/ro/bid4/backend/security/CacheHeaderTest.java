package ro.bid4.backend.security;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
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
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class CacheHeaderTest {
  @Autowired private MockMvc mvc;
  @Autowired private JwtService tokens;
  @Autowired private UserAccountRepository users;

  @Test
  @DisplayName("The impact counters are the same for everyone, so any cache may hold them")
  void publicCountersAreShareable() throws Exception {
    mvc.perform(get("/stats/public"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"));
  }

  @Test
  @DisplayName("A browsing row carries nothing of the reader when nobody is signed in")
  void browsingReadsAreSharedWhileSignedOut() throws Exception {
    mvc.perform(get("/auctions/featured"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
        .andExpect(header().stringValues(HttpHeaders.VARY, hasItem("Authorization")));
  }

  @Test
  @DisplayName("and is the one reader's alone the moment it does")
  void viewerShapedReadsArePrivate() throws Exception {
    mvc.perform(get("/auctions/featured").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=15, private"))
        .andExpect(header().stringValues(HttpHeaders.VARY, hasItem("Authorization")));

    mvc.perform(get("/causes/trending"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=15, private"));
  }

  @Test
  @DisplayName("Everything that did not opt in stays uncacheable")
  void everythingElseIsNoStore() throws Exception {
    mvc.perform(get("/auctions"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string(
                    HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate"));

    mvc.perform(get("/causes"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string(
                    HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate"));

    mvc.perform(get("/users/me/bids"))
        .andExpect(status().isUnauthorized())
        .andExpect(
            header()
                .string(
                    HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate"));
  }

  private String bearer() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    UserAccount account = new UserAccount();
    account.setEmail("cache-" + suffix + "@bid4.ro");
    account.setDisplayName("Cititor");
    account.setUsername("cache-" + suffix);
    account.setRole(UserRole.USER);
    account.setAccountType(AccountType.INDIVIDUAL);
    account.setEmailVerifiedAt(Instant.now());
    account.setAvatarUrl("");
    return "Bearer " + tokens.issueAccessToken(users.save(account)).value();
  }
}
