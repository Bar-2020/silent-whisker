/** What the app does about an answer, not what the server called it (SHELL-06). */
export type ApiErrorKind =
  | 'sessionExpired'
  | 'forbidden'
  | 'banned'
  | 'termsRequired'
  | 'rateLimited'
  | 'unavailable'
  | 'rejected';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** The server's `code`, when its answer had one (`INVALID_INPUT`, `CITY_NOT_FOUND`, ...). */
  readonly code: string | undefined;
  /** Only for `rateLimited`: how long to wait before the same call again (D-60). */
  readonly retryAfterSeconds: number | undefined;

  constructor(kind: ApiErrorKind, code?: string, retryAfterSeconds?: number) {
    super(code ?? kind);
    this.kind = kind;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
