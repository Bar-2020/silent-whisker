import { CONTACT_EMAIL } from '@constants/contact';
import { ApiError } from '@shared/api/api-error';
import { formatWait } from './format-wait';
import { Field } from './profile-form.types';
import { ProfileErrorCode } from './save-failure.types';
import type { SaveFailure } from './save-failure.types';

/** A banned member cannot save anything (R-08); the page says so with its permanent notice instead. */
export const isBannedFailure = (error: unknown): boolean =>
  error instanceof ApiError && error.kind === 'banned';

function rateLimitFailure(error: ApiError, language: string): SaveFailure {
  const seconds = error.retryAfterSeconds ?? 0;
  return error.code === ProfileErrorCode.DailyLimit
    ? {
        field: null,
        issue: { key: 'profile.error.dailyLimit', values: { wait: formatWait(seconds, language) } },
      }
    : { field: null, issue: { key: 'common.rateLimit.text', values: { n: seconds } } };
}

function codeFailure(code: string | undefined): SaveFailure {
  switch (code) {
    case ProfileErrorCode.ModerationRejected:
      return {
        field: Field.Name,
        issue: { key: 'firstrun.name.refused', values: { email: CONTACT_EMAIL } },
      };
    case ProfileErrorCode.CityNotFound:
      return { field: Field.City, issue: { key: 'firstrun.city.notFound' } };
    case ProfileErrorCode.InvalidInput:
      return { field: null, issue: { key: 'profile.error.invalid' } };
    case ProfileErrorCode.CheckUnavailable:
      return { field: null, issue: { key: 'profile.error.checkUnavailable' } };
    default:
      return { field: null, issue: { key: 'profile.error.generic' } };
  }
}

/** Each refusal of `PATCH /profile` in plain words (SHELL-06, D-62). */
export function describeFailure(error: unknown, language: string): SaveFailure {
  if (!(error instanceof ApiError)) return codeFailure(undefined);
  if (error.kind === 'rateLimited') return rateLimitFailure(error, language);
  if (error.kind === 'unavailable' && error.code === undefined) {
    return { field: null, issue: { key: 'profile.error.unavailable' } };
  }
  return codeFailure(error.code);
}
