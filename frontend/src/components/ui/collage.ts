const GAP = "var(--collage-gap)";

export const COLLAGE_GAP =
  "gap-(--collage-gap) [--collage-gap:0.25rem] sm:[--collage-gap:0.5rem]";

const HEIGHT = `calc((400cqw - 5 * ${GAP}) / 6)`;

const ONE_ROW = "minmax(0, 1fr)";
const TWO_ROWS = "repeat(2, minmax(0, 1fr))";

const WIDE = `calc(var(--h) * 0.75) repeat(2, calc((var(--h) - ${GAP}) * 0.375))`;

const COLLAGES: Record<number, { columns: string; rows: string }> = {
  1: { columns: ONE_ROW, rows: ONE_ROW },
  2: { columns: "repeat(2, minmax(0, 1fr))", rows: ONE_ROW },
  3: { columns: `calc(var(--h) * 0.75) minmax(0, 1fr)`, rows: TWO_ROWS },
  4: { columns: WIDE, rows: TWO_ROWS },
  5: { columns: WIDE, rows: TWO_ROWS },
};

export function collageStyle(shown: number): React.CSSProperties {
  const collage = COLLAGES[Math.min(Math.max(shown, 1), 5)]!;
  return {
    "--h": HEIGHT,
    height: "var(--h)",
    gridTemplateColumns: collage.columns,
    gridTemplateRows: collage.rows,
  } as React.CSSProperties;
}
