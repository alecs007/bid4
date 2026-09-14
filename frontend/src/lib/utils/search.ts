// TODO(backend): the real query needs the same folding, e.g. unaccent(lower(...)).
export function foldForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

export function matchesSearch(text: string, term: string): boolean {
  const haystack = foldForSearch(text);
  return foldForSearch(term)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
