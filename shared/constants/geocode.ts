import { CONTACT_EMAIL } from './contact';

/** Nominatim's usage policy asks for an identifying User-Agent with a contact address (D-29). */
export const GEOCODER_USER_AGENT = `SilentWhisker/1.0 (${CONTACT_EMAIL})`;

export const GEOCODER_URL = 'https://nominatim.openstreetmap.org/search';

/** Hebrew first, English where Hebrew has no name. */
export const GEOCODER_LANGUAGES = 'he,en';

export const GEOCODER_TIMEOUT_MS = 4000;

/** The whole app sends the geocoder at most one request in each of these (D-29, D-87). */
export const GEOCODER_SLOT_MS = 1000;

/** Tries to get a free slot before giving up, one per slot. */
export const GEOCODER_SLOT_TRIES = 3;

/** Longer text is no address, and it keeps the cache key far under DynamoDB's 2 KB key limit. */
export const GEOCODER_QUERY_MAX_LENGTH = 200;
