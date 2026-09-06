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

/**
 * What may be reused, and what may never be.
 *
 * <p>This exists because the headers were once correct in the code and absent from the wire: Spring
 * Security's own writer stamped {@code no-store} over them, and nothing failed. Asserting the
 * response rather than the configuration is the only way that stays fixed.
 */
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
    // Signed out there is no viewer in the body, so every visitor may be handed
    // the same copy — which is most of what a homepage serves. The Vary is what
    // keeps that copy from later being handed to somebody who is signed in.
    mvc.perform(get("/auctions/featured"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
        // Asserted across all the values rather than the first: CORS contributes
        // its own Vary entries, and reading only the first one tests nothing.
        .andExpect(header().stringValues(HttpHeaders.VARY, hasItem("Authorization")));
  }

  @Test
  @DisplayName("and is the one reader's alone the moment it does")
  void viewerShapedReadsArePrivate() throws Exception {
    // private, never public: the body now carries whether this viewer follows a
    // listing and where they stand in its bidding.
    mvc.perform(get("/auctions/featured").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=15, private"))
        .andExpect(header().stringValues(HttpHeaders.VARY, hasItem("Authorization")));

    // This one is per-viewer whoever asks, signed in or not.
    mvc.perform(get("/causes/trending"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=15, private"));
  }

  @Test
  @DisplayName("Everything that did not opt in stays uncacheable")
  void everythingElseIsNoStore() throws Exception {
    // The default has to survive replacing Security's writer with our own, or
    // this change would have quietly made every private response cacheable.
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

    // An endpoint that answers somebody's own data, refused here for want of a
    // token — the refusal must not be cached either.
    mvc.perform(get("/users/me/bids"))
        .andExpect(status().isUnauthorized())
        .andExpect(
            header()
                .string(
                    HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate"));
  }

  /** A real signed token rather than a stubbed principal, so the decoder is exercised too. */
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
