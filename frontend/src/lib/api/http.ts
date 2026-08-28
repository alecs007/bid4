import { API_BASE } from "@/lib/config";
import { ApiError, type ApiErrorBody, type AuthSession } from "@/lib/types";

/**
 * The access token lives here and nowhere else.
 *
 * Not localStorage, not a cookie the document can read: whatever a script on
 * the page can reach, a script that should not be on the page reaches too. A
 * module variable dies with the tab, which is the whole reason
 * `refreshSession()` exists — the httpOnly refresh cookie is what survives a
 * reload, and spending it mints a replacement.
 */
let accessToken: string | null = null;

export function readToken(): string | null {
  return accessToken;
}

export function writeToken(token: string | null): void {
  accessToken = token;
}

export interface HttpOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query string parameters; undefined and null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null | string[]>;
}

function buildUrl(path: string, query?: HttpOptions["query"]): string {
  const url = new URL(
    path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Endpoints that answer 401 for their own reasons; refreshing would loop. */
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

let refreshing: Promise<AuthSession | null> | null = null;

/** Serialises the exchange across tabs, where the browser supports it. */
const REFRESH_LOCK = "bid4.refresh";

async function exchangeRefreshCookie(): Promise<AuthSession | null> {
  try {
    const response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const session = (await response.json()) as AuthSession;
    if (!session.token) return null;
    writeToken(session.token);
    return session;
  } catch {
    return null;
  }
}

/**
 * Trades the refresh cookie for an access token, and the user that goes with it.
 *
 * The cookie is httpOnly, so nothing here reads it — `credentials: "include"`
 * is what sends it. The response carries the user as well as the token, which
 * is why boot restores a session with this one call and not a second one to
 * `/auth/me`.
 *
 * Two things have to be true at once for this to be safe, because refresh
 * tokens rotate and the server treats a spent one as a stolen copy and revokes
 * every session the account has.
 *
 * Within a tab, concurrent callers share one promise: a page firing five calls
 * that all expire together must send one refresh, not five.
 *
 * Across tabs is the harder half, and the reason for the lock. The access token
 * above is per-tab now, but the cookie jar is not — tabs restoring on the same
 * click, or going stale on the same timer, all reach for the same cookie, and
 * the second to arrive looks exactly like theft. The user is then signed out
 * everywhere through no fault of their own. The lock lets one tab through at a
 * time, so each presents the cookie its predecessor rotated into place, which
 * is an ordinary exchange rather than a replay.
 */
export function refreshSession(): Promise<AuthSession | null> {
  refreshing ??= (async () => {
    try {
      // Absent in older browsers and in any non-browser context; the in-tab
      // promise above still holds there.
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request(REFRESH_LOCK, exchangeRefreshCookie);
      }
      return await exchangeRefreshCookie();
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function send(
  path: string,
  { body, query, headers, ...init }: HttpOptions,
  token: string | null,
): Promise<Response> {
  return fetch(buildUrl(path, query), {
    ...init,
    // The refresh token travels as a cookie, which a cross-origin fetch drops
    // unless it is asked for.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function unwrap<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = payload as Partial<ApiErrorBody> | null;
    throw new ApiError({
      status: response.status,
      code: errorBody?.code ?? "HTTP_ERROR",
      message:
        errorBody?.message ??
        "A apărut o problemă de conexiune. Încearcă din nou în câteva momente.",
      fieldErrors: errorBody?.fieldErrors,
    });
  }

  return payload as T;
}

/**
 * The single fetch wrapper used when `NEXT_PUBLIC_USE_MOCK=false`.
 *
 * Access tokens are deliberately short-lived, so a 401 is the expected way a
 * session continues rather than a failure: refresh once, retry once, and only
 * then surface the error.
 */
export async function http<T>(
  path: string,
  options: HttpOptions = {},
): Promise<T> {
  const stale = accessToken;
  const response = await send(path, options, stale);

  if (response.status !== 401 || NO_REFRESH.some((p) => path.startsWith(p))) {
    return unwrap<T>(response);
  }

  // A call that overlapped this one may already have replaced the token, in
  // which case retrying is enough and a second rotation is waste.
  const token =
    accessToken && accessToken !== stale
      ? accessToken
      : ((await refreshSession())?.token ?? null);

  if (!token) {
    writeToken(null);
    return unwrap<T>(response);
  }

  return unwrap<T>(await send(path, options, token));
}
