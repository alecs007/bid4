export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      // Strip the combining marks NFD just split off (ă -> a + U+0306).
      .replace(/[̀-ͯ]/g, "")
      // ș and ț decompose to a comma-below mark that NFD does not always split.
      .replace(/[șş]/g, "s")
      .replace(/[țţ]/g, "t")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const existing = new Set(taken);
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
