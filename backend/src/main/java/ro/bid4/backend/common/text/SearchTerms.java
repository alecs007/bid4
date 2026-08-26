package ro.bid4.backend.common.text;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Turning what someone typed into something safe to put in a LIKE.
 *
 * <p>Lives here rather than beside one feature because auctions and causes search the same way and
 * must agree: a term that finds a listing has to find the cause it belongs to.
 */
public final class SearchTerms {

  /**
   * The escape character for LIKE patterns.
   *
   * <p>A backslash, declared explicitly in the query rather than relied on: Postgres defaults to
   * one, but {@code standard_conforming_strings} has moved before and a search box is not the place
   * to find out.
   */
  public static final char LIKE_ESCAPE = '\\';

  private SearchTerms() {}

  /**
   * Mirrors foldForSearch in frontend/src/lib/utils/search.ts.
   *
   * <p>Romanian is typed both ways — "bicicleta" has to find "Bicicletă" — and nobody adds the
   * marks in a search box. The column is folded by Postgres {@code unaccent}, which strips the same
   * combining marks, so the two sides meet in the middle.
   */
  public static String fold(String value) {
    String stripped =
        Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
    // ș and ț carry a comma below that NFD does not always separate.
    return stripped.replace('ș', 's').replace('ş', 's').replace('ț', 't').replace('ţ', 't');
  }

  /** The words that must each appear somewhere. Empty when nothing was typed. */
  public static List<String> words(String term) {
    if (term == null || term.isBlank()) {
      return List.of();
    }
    return Arrays.stream(fold(term).split("\\s+")).filter(word -> !word.isEmpty()).toList();
  }

  /**
   * One word as a contains-pattern, with its wildcards defanged.
   *
   * <p>{@code %} and {@code _} are wildcards to LIKE and ordinary characters to the person typing
   * them. Left alone, a search for {@code %} matches every row in the table and a search for {@code
   * _} matches nearly as many — a cheap way to make the database do the most expensive version of a
   * query that was supposed to narrow things down.
   */
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
