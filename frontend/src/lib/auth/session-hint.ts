/**
 * Whether somebody was signed in last time, on `<html>` before the first paint.
 *
 * <p>Boot cannot know who is here without asking the API — the refresh cookie is
 * httpOnly and nothing about the session outlives a reload locally — so the
 * header spent a round trip with nothing to draw. It drew a placeholder, and a
 * returning visitor watched it turn into a row of a different width.
 *
 * <p>This is a guess, not a session: it grants nothing and is read by no request.
 * It lives on the document element rather than in React state because that is
 * the one place a blocking script can write before the header is parsed and CSS
 * can act on without a render — which is what keeps the server's markup and the
 * client's first render identical.
 */

export const SESSION_HINT_KEY = "bid4:session";

/** Runs before the header exists, so it stays one statement and swallows its own errors. */
export const SESSION_HINT_SCRIPT = `try{document.documentElement.dataset.session=localStorage.getItem(${JSON.stringify(
  SESSION_HINT_KEY,
)})==="in"?"in":"out"}catch(e){document.documentElement.dataset.session="out"}`;

export function rememberSession(signedIn: boolean): void {
  const hint = signedIn ? "in" : "out";
  document.documentElement.dataset.session = hint;
  try {
    localStorage.setItem(SESSION_HINT_KEY, hint);
  } catch {
    // Private browsing refuses the write. The next visit opens signed-out.
  }
}
