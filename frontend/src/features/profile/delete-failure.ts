import type { TFunction } from 'i18next';
import { ApiError } from '@shared/api/api-error';

/** A refused or failed delete in plain words, for the dialog (R-21, SHELL-06). */
export function describeDeleteFailure(error: Error, t: TFunction): string {
  if (error instanceof ApiError && error.kind === 'rateLimited') {
    return t('common.rateLimit.text', { n: error.retryAfterSeconds ?? 0 });
  }
  if (error instanceof ApiError && error.kind === 'unavailable') {
    return t('profile.error.unavailable');
  }
  return t('profile.delete.error');
}
