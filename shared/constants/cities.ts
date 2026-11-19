/** Where the app reads the city files: one per language, `<code>.json`, on the site (D-117). */
export const CITY_FILES_PATH = '/cities';

/** The same folder as a key prefix in the site's S3 bucket, where `npm run cities:upload` puts the files. */
export const CITY_FILES_FOLDER = 'cities';

/** A new list with fewer places is refused: the source is plausibly broken, and the list on the site stays (D-117). */
export const CITY_LIST_MIN_PLACES = 1000;

/** How long a running profile function keeps the codes it read from S3 before reading them again (D-117). */
export const CITY_CODES_CACHE_SECONDS = 3600;
