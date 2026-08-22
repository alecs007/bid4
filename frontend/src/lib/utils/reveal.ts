/**
 * Staggered entrance for a list of cards replacing their skeletons: each one
 * starts a beat after the one before it, so the grid reads as filling in
 * rather than appearing all at once.
 *
 * The stagger is capped, otherwise the last card of a long page would wait
 * long enough to look broken.
 */
const STEP_MS = 35;
const MAX_DELAY_MS = 320;

export function revealDelay(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index * STEP_MS, MAX_DELAY_MS)}ms` };
}
