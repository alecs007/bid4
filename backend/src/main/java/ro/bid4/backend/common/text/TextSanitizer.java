package ro.bid4.backend.common.text;

import java.text.Normalizer;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

/**
 * Cleans user text on the way in, so what is stored is already safe to hand back.
 *
 * <p>The API returns JSON, which is not an HTML context, so escaping is not the defence — the
 * defence is that no stored value contains active markup in the first place. Sanitising on write
 * rather than on read means it happens once, and a second consumer of the same row cannot forget.
 */
@Component
public class TextSanitizer {

  /** Strips every tag and attribute. Nothing the platform stores needs markup. */
  private static final PolicyFactory PLAIN_TEXT = new HtmlPolicyBuilder().toFactory();

  /**
   * What a cause story may keep: emphasis, paragraphs and lists. No links, no images, no styles —
   * an anchor is a phishing vector and an image is a tracking pixel.
   */
  private static final PolicyFactory STORY =
      new HtmlPolicyBuilder()
          .allowElements("p", "br", "strong", "em", "b", "i", "ul", "ol", "li")
          .toFactory();

  /** Single-line values: names, titles, cities. Markup and control characters removed. */
  public String plain(String raw) {
    if (raw == null) {
      return null;
    }
    String stripped = PLAIN_TEXT.sanitize(normalise(raw));
    return unescape(stripped).replaceAll("\\s+", " ").trim();
  }

  /** Long-form text that may carry light structure. */
  public String story(String raw) {
    return raw == null ? null : STORY.sanitize(normalise(raw)).trim();
  }

  /**
   * NFC first, then control characters out.
   *
   * <p>Unicode matters here beyond tidiness: "ă" can be written as one code point or as "a" plus a
   * combining accent, and two spellings of the same name defeat a uniqueness check. Bidirectional
   * overrides are dropped because they let a display name reorder the text around it.
   */
  private static String normalise(String raw) {
    String normalised = Normalizer.normalize(raw, Normalizer.Form.NFC);
    return normalised.replaceAll("[\\p{Cc}\\p{Cf}&&[^\\n\\t]]", "");
  }

  /** The sanitizer escapes what it keeps; stored text should be the characters themselves. */
  private static String unescape(String value) {
    return value
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&");
  }
}
