const GAP = "var(--collage-gap)";

export const COLLAGE_GAP = "gap-(--collage-gap) [--collage-gap:0.25rem] sm:[--collage-gap:0.5rem]";

const WIDE = `calc(var(--h) * 0.75) repeat(2, calc((var(--h) - ${GAP}) * 0.375))`;

const COLLAGES: Record<number, { height: string; columns: string }> = {
  3: {
    height: `calc((800cqw - 5 * ${GAP}) / 9)`,
    columns: `calc(var(--h) * 0.75) calc((var(--h) - ${GAP}) * 0.375)`,
  },
  4: { height: `calc((400cqw - 5 * ${GAP}) / 6)`, columns: WIDE },
  5: { height: `calc((400cqw - 5 * ${GAP}) / 6)`, columns: WIDE },
};

export function collageStyle(shown: number): React.CSSProperties | null {
  const collage = COLLAGES[shown];
  if (!collage) return null;
  return {
    "--h": collage.height,
    height: "var(--h)",
    gridTemplateColumns: collage.columns,
    gridTemplateRows: "repeat(2, minmax(0, 1fr))",
  } as React.CSSProperties;
}
