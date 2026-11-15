/** The server's own words for why a save was refused (docs/API.md). */
export enum ProfileErrorCode {
  InvalidInput = 'INVALID_INPUT',
  ModerationRejected = 'MODERATION_REJECTED',
  CityNotFound = 'CITY_NOT_FOUND',
  DailyLimit = 'PROFILE_SAVE_DAILY_LIMIT',
  CheckUnavailable = 'CHECK_UNAVAILABLE',
}

/** Where react-hook-form shows it: under a field, or above the buttons (`root.server`). */
export interface SaveFailure {
  readonly field: 'fullName' | 'cityName' | 'root.server';
  readonly message: string;
}
