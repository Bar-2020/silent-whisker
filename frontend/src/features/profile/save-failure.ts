import type { TFunction } from 'i18next';
import { CONTACT_EMAIL } from '@constants/contact';
import { ApiError } from '@shared/api/api-error';
import { formatWait } from './format-wait';
import { ProfileErrorCode } from './save-failure.types';
import type { SaveFailure } from './save-failure.types';

/** A refusal of `PATCH /profile` in plain words, or null for a ban: the page's permanent notice says that (R-08). */
export function describeSaveFailure(
  error: Error,
  t: TFunction,
  language: string
): SaveFailure | null {
  if (!(error instanceof ApiError))
    return { field: 'root.server', message: t('profile.error.generic') };
  if (error.kind === 'banned') return null;
  if (error.kind === 'rateLimited')
    return { field: 'root.server', message: rateLimitMessage(error, t, language) };
  switch (error.code) {
    case ProfileErrorCode.ModerationRejected:
      return { field: 'name', message: t('firstrun.name.refused', { email: CONTACT_EMAIL }) };
    case ProfileErrorCode.CityNotFound:
      return { field: 'city', message: t('firstrun.city.notFound') };
    case ProfileErrorCode.InvalidInput:
      return { field: 'root.server', message: t('profile.error.invalid') };
    case ProfileErrorCode.CheckUnavailable:
      return { field: 'root.server', message: t('profile.error.checkUnavailable') };
    default:
      return {
        field: 'root.server',
        message:
          error.kind === 'unavailable' && error.code === undefined
            ? t('profile.error.unavailable')
            : t('profile.error.generic'),
      };
  }
}

function rateLimitMessage(error: ApiError, t: TFunction, language: string): string {
  const seconds = error.retryAfterSeconds ?? 0;
  return error.code === ProfileErrorCode.DailyLimit
    ? t('profile.error.dailyLimit', { wait: formatWait(seconds, language) })
    : t('common.rateLimit.text', { n: seconds });
}
