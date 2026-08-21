import { API_BASE } from "@/lib/config";
import { ApiError, type ApiErrorBody } from "@/lib/types";

/**
 * The single fetch wrapper used when `NEXT_PUBLIC_USE_MOCK=false`.
 *
 * Every `lib/api/*` function branches on USE_MOCK and calls this in the real
 * path, so switching to the Spring Boot backend never touches a component.
 *
 * TODO(backend): the token below is a mock string today. Once Spring Security
 * issues real JWTs, this is already the right place — add refresh handling and
 * a 401 -> redirect-to-login hook here, nowhere else.
 */

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

export async function http<T>(
  path: string,
  { body, query, headers, ...init }: HttpOptions = {},
): Promise<T> {
  const token = readToken();

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = payload as Partial<ApiErrorBody> | null;
    throw new ApiError({
      status: response.status,
      code: errorBody?.code ?? "HTTP_ERROR",
      message:
        errorBody?.message ??
        "A apărut o problemă de conexiune. Mai încearcă o dată.",
      fieldErrors: errorBody?.fieldErrors,
    });
  }

  return payload as T;
}
