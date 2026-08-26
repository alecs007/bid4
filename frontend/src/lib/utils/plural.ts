/**
 * One takes the singular; two to nineteen the plural bare; twenty and up take
 * "de" — "31 de produse". The rule works off the last two digits, so it holds at
 * 101 (bare) and 120 ("de") too.
 */
export function countRo(count: number, one: string, many: string): string {
  if (count === 1) return `1 ${one}`;

  const lastTwo = Math.abs(count) % 100;
  const needsDe = count !== 0 && (lastTwo === 0 || lastTwo >= 20);

  return `${count} ${needsDe ? "de " : ""}${many}`;
}
