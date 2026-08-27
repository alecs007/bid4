import { API_BASE } from "@/lib/config";
import { ApiError, type ApiErrorBody } from "@/lib/types";

const TOKEN_KEY = "bid4.token";

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    // Mirrored into a cookie so server components can read it after the swap.
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
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

let refreshing: Promise<string | null> | null = null;

/** Serialises the exchange across tabs, where the browser supports it. */
const REFRESH_LOCK = "bid4.refresh";

async function exchangeRefreshCookie(): Promise<string | null> {
  try {
    const response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const session = (await response.json()) as { token?: string };
    if (!session.token) return null;
    writeToken(session.token);
    return session.token;
  } catch {
    return null;
  }
}

/**
 * Trades the refresh cookie for a new access token.
 *
 * The cookie is httpOnly, so nothing here reads it — `credentials: "include"`
 * is what sends it.
 *
 * Two things have to be true at once for this to be safe, because refresh
 * tokens rotate and the server treats a spent one as a stolen copy and revokes
 * every session the account has.
 *
 * Within a tab, concurrent callers share one promise: a page firing five calls
 * that all expire together must send one refresh, not five.
 *
 * Across tabs is the harder half, and the reason for the lock. Access tokens
 * live in localStorage, which every tab shares, so two tabs go stale at the
 * same instant and both reach for the same cookie. The second one to arrive
 * looks exactly like theft, and the user is signed out everywhere through no
 * fault of their own. The lock lets one tab through at a time, and the ones
 * that waited find the token already replaced and use it instead of asking
 * again — which is also one fewer request.
 */
function refreshSession(stale: string | null): Promise<string | null> {
  refreshing ??= (async () => {
    const exchangeUnlessSomeoneElseDidIt = async () => {
      const current = readToken();
      if (current && current !== stale) return current;
      return exchangeRefreshCookie();
    };

    try {
      // Absent in older browsers and in any non-browser context; the in-tab
      // promise above still holds there.
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request(
          REFRESH_LOCK,
          exchangeUnlessSomeoneElseDidIt,
        );
      }
      return await exchangeUnlessSomeoneElseDidIt();
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
  const stale = readToken();
  const response = await send(path, options, stale);

  if (response.status !== 401 || NO_REFRESH.some((p) => path.startsWith(p))) {
    return unwrap<T>(response);
  }

  // The token that just failed, so a tab that waited on the lock can tell a
  // replacement from the one it already tried.
  const token = await refreshSession(stale);
  if (!token) {
    writeToken(null);
    return unwrap<T>(response);
  }

  return unwrap<T>(await send(path, options, token));
}
