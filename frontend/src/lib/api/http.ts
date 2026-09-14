import { API_BASE } from "@/lib/config";
import { ApiError, type ApiErrorBody, type AuthSession } from "@/lib/types";

let accessToken: string | null = null;

export function readToken(): string | null {
  return accessToken;
}

export function writeToken(token: string | null): void {
  accessToken = token;
}

export interface HttpOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<
    string,
    string | number | boolean | undefined | null | readonly string[]
  >;
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

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

let refreshing: Promise<AuthSession | null> | null = null;

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

export function refreshSession(): Promise<AuthSession | null> {
  refreshing ??= (async () => {
    try {
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

export async function http<T>(
  path: string,
  options: HttpOptions = {},
): Promise<T> {
  const stale = accessToken;
  const response = await send(path, options, stale);

  if (response.status !== 401 || NO_REFRESH.some((p) => path.startsWith(p))) {
    return unwrap<T>(response);
  }

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
