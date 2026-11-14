import { z } from 'zod';
import {
  API_PATH_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  STATUS_FORBIDDEN,
  STATUS_SERVER_ERROR,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAUTHORIZED,
} from '@constants/http';
import { forgetSession, getIdToken } from '@shared/auth/session';
import { ApiError, type ApiErrorKind } from './api-error';

const errorBodySchema = z.object({ code: z.string() });
const retryAfterSchema = z.coerce.number().int().positive();

/** The server's own code first: `BANNED` and `TERMS_REQUIRED` are told apart from a plain refusal. */
function kindOf(status: number, code: string | undefined): ApiErrorKind {
  if (code === 'BANNED') return 'banned';
  if (code === 'TERMS_REQUIRED') return 'termsRequired';
  if (code === 'FORBIDDEN') return 'forbidden';
  // Every 429 is alike: the front door's is bare, the per-member one carries a code (D-60, R-21).
  if (status === STATUS_TOO_MANY_REQUESTS) return 'rateLimited';
  if (status === STATUS_UNAUTHORIZED || code === 'UNAUTHORIZED') return 'sessionExpired';
  if (status === STATUS_FORBIDDEN) return 'forbidden';
  if (status >= STATUS_SERVER_ERROR) return 'unavailable';
  return 'rejected';
}

async function refusal(response: Response): Promise<ApiError> {
  const body = errorBodySchema.safeParse(await response.json().catch(() => null));
  const code = body.success ? body.data.code : undefined;
  const kind = kindOf(response.status, code);
  if (kind === 'sessionExpired') await forgetSession();
  if (kind !== 'rateLimited') return new ApiError(kind, code);
  const wait = retryAfterSchema.safeParse(response.headers.get('retry-after'));
  return new ApiError(kind, code, wait.success ? wait.data : DEFAULT_RETRY_AFTER_SECONDS);
}

async function send(path: string, token: string): Promise<Response> {
  try {
    return await fetch(`${API_PATH_PREFIX}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    // No connection: nothing is queued, the caller says so and the member tries again (SHELL-06).
    throw new ApiError('unavailable');
  }
}

/** One GET to the API with the member's ID token. The answer is parsed with `schema` (D-101). */
export async function apiRequest<Schema extends z.ZodType>(
  path: string,
  schema: Schema
): Promise<z.infer<Schema>> {
  const token = await getIdToken().catch(() => {
    throw new ApiError('unavailable');
  });
  if (token === null) {
    // Signed out in another tab: this tab learns it from the tokens going away.
    await forgetSession();
    throw new ApiError('sessionExpired');
  }
  const response = await send(path, token);
  if (!response.ok) throw await refusal(response);
  return schema.parse(await response.json());
}
