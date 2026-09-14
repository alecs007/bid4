package ro.bid4.backend.common.text;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public final class SearchTerms {
  public static final char LIKE_ESCAPE = '\\';

  private SearchTerms() {}

  public static String fold(String value) {
    String stripped =
        Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
    return stripped.replace('ș', 's').replace('ş', 's').replace('ț', 't').replace('ţ', 't');
  }

  public static List<String> words(String term) {
    if (term == null || term.isBlank()) {
      return List.of();
    }
    return Arrays.stream(fold(term).split("\\s+")).filter(word -> !word.isEmpty()).toList();
  }

  public static String containsPattern(String word) {
    StringBuilder escaped = new StringBuilder(word.length() + 8);
    for (char character : word.toCharArray()) {
      if (character == LIKE_ESCAPE || character == '%' || character == '_') {
        escaped.append(LIKE_ESCAPE);
      }
      escaped.append(character);
    }
    return "%" + escaped + "%";
  }
}
