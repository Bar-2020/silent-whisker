export const STATUS_OK = 200;
export const STATUS_BAD_REQUEST = 400;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_FORBIDDEN = 403;
export const STATUS_NOT_FOUND = 404;
export const STATUS_UNPROCESSABLE = 422;
export const STATUS_TOO_MANY_REQUESTS = 429;
export const STATUS_UNAVAILABLE = 503;
/** Every answer from here up means the server could not do it, whatever its code (SHELL-06). */
export const STATUS_SERVER_ERROR = 500;

/** The API lives under this path on the app's own address (D-60). */
export const API_PATH_PREFIX = '/api';

/** How long the app waits after a 429 that carries no `Retry-After` (D-60). */
export const DEFAULT_RETRY_AFTER_SECONDS = 30;
