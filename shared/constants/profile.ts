/** Only photos on this domain are stored (D-21). */
export const GOOGLE_IMAGE_HOST_SUFFIX = '.googleusercontent.com';

/** Raised when the terms or privacy policy change, so everyone accepts again (D-69, R-36). */
export const TERMS_VERSION = 1;

/** Full name and city, counted in characters (D-61, D-92). */
export const PROFILE_TEXT_MIN_LENGTH = 2;
export const PROFILE_TEXT_MAX_LENGTH = 35;

/** The full name is stricter than the city: at least three characters and three letters (D-116). */
export const PROFILE_NAME_MIN_LENGTH = 3;

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

/** Each save that changes the name or city runs one paid text check (D-61). */
export const PROFILE_SAVES_PER_DAY = 5;

/** The text check gives up after this long and the save answers CHECK_UNAVAILABLE (D-62). */
export const TEXT_CHECK_TIMEOUT_MS = 4000;

/** The avatar shows the first letter of this many words of the name when there is no photo. */
export const AVATAR_INITIALS_COUNT = 2;
