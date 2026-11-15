import type { TFunction } from 'i18next';
import { CONTACT_EMAIL } from '@constants/contact';
import { ApiError } from '@shared/api/api-error';
import { ProfileErrorCode } from './save-failure.types';
import type { SaveFailure } from './save-failure.types';

/** A refusal of `PATCH /profile` in plain words, or null for a ban: the page's permanent notice says that (R-08). */
export function describeSaveFailure(error: Error, t: TFunction): SaveFailure | null {
  if (!(error instanceof ApiError))
    return { field: 'root.server', message: t('profile.error.generic') };
  if (error.kind === 'banned') return null;
  if (error.kind === 'rateLimited')
    return { field: 'root.server', message: rateLimitMessage(error, t) };
  switch (error.code) {
    case ProfileErrorCode.ModerationRejected:
      return { field: 'fullName', message: t('firstrun.name.refused', { email: CONTACT_EMAIL }) };
    case ProfileErrorCode.CityNotFound:
      return { field: 'cityName', message: t('firstrun.city.notFound') };
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

function rateLimitMessage(error: ApiError, t: TFunction): string {
  return error.code === ProfileErrorCode.DailyLimit
    ? t('profile.error.dailyLimit')
    : t('common.rateLimit.text', { n: error.retryAfterSeconds ?? 0 });
}
