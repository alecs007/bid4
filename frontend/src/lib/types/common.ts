
export type ID = string;

/** ISO-8601 with timezone, e.g. "2026-08-21T14:30:00.000Z". */
export type ISODateString = string;

/** Spring Data `Page<T>` maps onto this one-to-one. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  status: number;
  code: string;
  /** Already-translated, user-facing Romanian message. */
  message: string;
  fieldErrors?: Record<string, string>;
}

/** Thrown by every function in `lib/api/*`, mock or real. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
  }
}

export type SortDirection = "asc" | "desc";
