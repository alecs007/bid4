package ro.bid4.backend.identity.service;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.Locale;
import org.springframework.stereotype.Component;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * Turns a display name into the slug the public profile lives at.
 *
 * <p>The result must satisfy the users_username_shape constraint in V1: lowercase alphanumerics and
 * hyphens, 2 to 40 characters, never starting or ending with a hyphen.
 */
@Component
public class UsernameFactory {

  private static final int MAX_LENGTH = 32;
  private static final int MAX_ATTEMPTS = 50;

  private final UserAccountRepository users;
  private final SecureRandom random = new SecureRandom();

  public UsernameFactory(UserAccountRepository users) {
    this.users = users;
  }

  public String uniqueFrom(String displayName) {
    String base = slugify(displayName);
    if (base.length() < 2) {
      base = "membru";
    }

    if (!users.existsByUsername(base)) {
      return base;
    }

    // Counting up would leak how many accounts share a name and make the next
    // one guessable, so the suffix is random.
    for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      String candidate = base + "-" + Integer.toString(random.nextInt(0x10000), 36);
      if (!users.existsByUsername(candidate)) {
        return candidate;
      }
    }
    throw new IllegalStateException("Could not derive a free username for " + base);
  }

  /** "Ana-Maria Ionescu" becomes "ana-maria-ionescu"; diacritics fold to ASCII. */
  static String slugify(String raw) {
    String ascii =
        Normalizer.normalize(raw == null ? "" : raw, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            // ș and ț carry a comma below that NFD does not always separate.
            .replace("ș", "s")
            .replace("ț", "t")
            .replace("Ș", "S")
            .replace("Ț", "T");

    String slug =
        ascii
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "");

    return slug.length() > MAX_LENGTH ? slug.substring(0, MAX_LENGTH).replaceAll("-$", "") : slug;
  }
}
