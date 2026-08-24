/**
 * Folds text down to what a search should actually compare: lowercase, no
 * diacritics. Romanian is typed both ways — "bicicleta" has to find
 * "Bicicletă" — and nobody adds the marks in a search box.
 *
 * TODO(backend): the real query needs the same folding, e.g. Postgres
 * `unaccent(lower(...))` on both the column and the term, or a generated
 * column indexed for it.
 */
export function foldForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Strip the combining marks NFD just split off (ă -> a + U+0306).
    .replace(/[̀-ͯ]/g, "")
    // ș and ț carry a comma below that NFD does not always separate.
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

/** True when every word in the term appears somewhere in the text. */
export function matchesSearch(text: string, term: string): boolean {
  const haystack = foldForSearch(text);
  return foldForSearch(term)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
