import type { Field, Issue } from './profile-form.types';

/** The server's own words for why a save was refused (docs/API.md). */
export enum ProfileErrorCode {
  InvalidInput = 'INVALID_INPUT',
  ModerationRejected = 'MODERATION_REJECTED',
  CityNotFound = 'CITY_NOT_FOUND',
  DailyLimit = 'PROFILE_SAVE_DAILY_LIMIT',
  CheckUnavailable = 'CHECK_UNAVAILABLE',
}

/** What to tell the member, and under which field (none: above the button). */
export interface SaveFailure {
  readonly field: Field | null;
  readonly issue: Issue;
}
