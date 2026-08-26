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

/**
 * Trades the refresh cookie for a new access token.
 *
 * The cookie is httpOnly, so nothing here reads it — `credentials: "include"`
 * is what sends it. Concurrent callers share one request: a page that fires
 * five calls at once should not open five sessions and invalidate four of them,
 * since the server treats a spent refresh token as theft.
 */
function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
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
  const response = await send(path, options, readToken());

  if (response.status !== 401 || NO_REFRESH.some((p) => path.startsWith(p))) {
    return unwrap<T>(response);
  }

  const token = await refreshSession();
  if (!token) {
    writeToken(null);
    return unwrap<T>(response);
  }

  return unwrap<T>(await send(path, options, token));
}
