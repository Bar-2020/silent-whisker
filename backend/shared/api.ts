import type { z } from 'zod';
import { STATUS_BAD_REQUEST, STATUS_TOO_MANY_REQUESTS } from '../../shared/constants/http';
import type { ApiEvent, ApiResult } from './api.types';
import { idTokenClaimsSchema } from './schemas/claims.schema';
import type { IdTokenClaims } from './schemas/claims.schema';

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

/** The one answer for a body that is not JSON or does not match its schema. */
export const invalidInput = (): Refusal => new Refusal(refuse(STATUS_BAD_REQUEST, 'INVALID_INPUT'));

/** A request body checked by its schema (`shared/schemas/`); any mismatch is `INVALID_INPUT`. */
export function parseBody<S extends z.ZodType>(schema: S, body: string | undefined): z.infer<S> {
  let json: unknown;
  try {
    json = JSON.parse(body ?? '');
  } catch {
    throw invalidInput();
  }
  const result = schema.safeParse(json);
  if (!result.success) throw invalidInput();
  return result.data;
}

/**
 * The claims of a member (R-22): a verified ID token with a subject. The authorizer also accepts
 * access tokens, but only the ID token carries the Google photo (D-59).
 */
export function verifiedClaims(event: ApiEvent): IdTokenClaims | undefined {
  const result = idTokenClaimsSchema.safeParse(event.requestContext.authorizer?.jwt?.claims);
  return result.success ? result.data : undefined;
}
