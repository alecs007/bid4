export function countRo(count: number, one: string, many: string): string {
  if (count === 1) return `1 ${one}`;

  const lastTwo = Math.abs(count) % 100;
  const needsDe = count !== 0 && (lastTwo === 0 || lastTwo >= 20);

  return `${count} ${needsDe ? "de " : ""}${many}`;
}

export function pluralRo(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
