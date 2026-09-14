package ro.bid4.backend.common.text;

import java.text.Normalizer;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

@Component
public class TextSanitizer {
  private static final PolicyFactory PLAIN_TEXT = new HtmlPolicyBuilder().toFactory();

  private static final PolicyFactory STORY =
      new HtmlPolicyBuilder()
          .allowElements("p", "br", "strong", "em", "b", "i", "ul", "ol", "li")
          .toFactory();

  public String plain(String raw) {
    if (raw == null) {
      return null;
    }
    String stripped = PLAIN_TEXT.sanitize(normalise(raw));
    return unescape(stripped).replaceAll("\\s+", " ").trim();
  }

  public String story(String raw) {
    return raw == null ? null : STORY.sanitize(normalise(raw)).trim();
  }

  private static String normalise(String raw) {
    String normalised = Normalizer.normalize(raw, Normalizer.Form.NFC);
    return normalised.replaceAll("[\\p{Cc}\\p{Cf}&&[^\\n\\t]]", "");
  }

  private static String unescape(String value) {
    return value
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&");
  }
}
