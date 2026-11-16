/** Only photos on this domain are stored (D-21). */
export const GOOGLE_IMAGE_HOST_SUFFIX = '.googleusercontent.com';

/** Raised when the terms or privacy policy change, so everyone accepts again (D-69, R-36). */
export const TERMS_VERSION = 1;

/** The full name, counted in characters: at least three characters and three letters (D-61, D-116). */
export const PROFILE_NAME_MIN_LENGTH = 3;
export const PROFILE_NAME_MAX_LENGTH = 35;

/** A name made only of these words is refused, in any case: obvious fakes and words that pass for staff (D-116). */
export const PROFILE_NAME_BLOCKED_WORDS = [
  'test',
  'admin',
  'administrator',
  'moderator',
  'qwerty',
  'asdf',
  'anonymous',
  'unknown',
  'בדיקה',
  'אדמין',
  'מנהל',
  'אנונימי',
  'тест',
  'админ',
  'аноним',
] as const;

/** How many places the city box lists under what the member typed (D-117). */
export const CITY_SUGGESTIONS_LIMIT = 8;

/** Each save that changes the name runs one paid text check (D-61, D-117). */
export const PROFILE_SAVES_PER_DAY = 5;

/** The text check gives up after this long and the save answers CHECK_UNAVAILABLE (D-62). */
export const TEXT_CHECK_TIMEOUT_MS = 4000;

/** The avatar shows the first letter of this many words of the name when there is no photo. */
export const AVATAR_INITIALS_COUNT = 2;
