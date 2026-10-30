import { STATUS_TOO_MANY_REQUESTS } from '../../shared/constants/http';
import type { ApiEvent, ApiResult, Claims } from './api.types';

export const reply = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): ApiResult => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  body: JSON.stringify(body),
});

/** An error answer is `{ "code": ... }` with the status (API.md). */
export const refuse = (
  statusCode: number,
  code: string,
  headers: Record<string, string> = {}
): ApiResult => reply(statusCode, { code }, headers);

/** A per-member limit answer: 429 with the seconds until the member may try again (R-21). */
export const rateLimited = (code: string, retryAfterSeconds: number): ApiResult =>
  refuse(STATUS_TOO_MANY_REQUESTS, code, { 'retry-after': String(retryAfterSeconds) });

/** Thrown to stop a handler with an error answer from deep inside its steps. */
export class Refusal extends Error {
  constructor(readonly result: ApiResult) {
    super(`Refused with ${String(result.statusCode)}`);
  }
}

/**
 * The claims of a member (R-22): a verified ID token with a subject. The authorizer also accepts
 * access tokens, but only the ID token carries the Google photo (D-59).
 */
export function verifiedClaims(event: ApiEvent): Claims | undefined {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  return claims?.token_use === 'id' && claims.sub ? (claims as Claims) : undefined;
}
