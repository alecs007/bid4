/**
 * Staggered entrance for cards replacing their skeletons. Capped, or the last
 * card of a long page would wait long enough to look broken.
 */
const STEP_MS = 35;
const MAX_DELAY_MS = 320;

export function revealDelay(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index * STEP_MS, MAX_DELAY_MS)}ms` };
}
