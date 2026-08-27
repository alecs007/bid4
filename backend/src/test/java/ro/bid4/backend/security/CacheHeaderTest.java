package ro.bid4.backend.security;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

  @Test
  @DisplayName("The impact counters are the same for everyone, so any cache may hold them")
  void publicCountersAreShareable() throws Exception {
    mvc.perform(get("/stats/public"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"));
  }

  @Test
  @DisplayName("A browsing row is reusable by the one browser that asked, and no further")
  void viewerShapedReadsArePrivate() throws Exception {
    mvc.perform(get("/auctions/featured"))
        .andExpect(status().isOk())
        // private, never public: the body carries whether the viewer follows a
        // listing and where they stand in its bidding.
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=15, private"))
        // Without this a cache may answer a signed-in request with the anonymous
        // copy it stored earlier, or the reverse. Asserted across all the values
        // rather than the first: CORS contributes its own Vary entries, and
        // reading only the first one tests nothing.
        .andExpect(header().stringValues(HttpHeaders.VARY, hasItem("Authorization")));

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
}
