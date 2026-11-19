/** Where the app reads the city files: one per language, `<code>.json`, on the site (D-117). */
export const CITY_FILES_PATH = '/cities';

/** The same folder as a key prefix in the site's S3 bucket, where `npm run cities:upload` puts the files. */
export const CITY_FILES_FOLDER = 'cities';

/** A new list with fewer places is refused: the source is plausibly broken, and the list on the site stays (D-117). */
export const CITY_LIST_MIN_PLACES = 1000;

/** How long a running profile function keeps the codes it read from S3 before reading them again (D-117). */
export const CITY_CODES_CACHE_SECONDS = 3600;

/** The government's list of localities in four languages (data.gov.il, National Digital Agency), read by the monthly job and by `npm run cities:upload` (D-117). */
export const CITY_SOURCE_URL =
  'https://data.gov.il/api/3/action/datastore_search?resource_id=e9701dcb-9f1c-43bb-bd44-eb380ade542f&limit=5000';

/** The source answers in a few seconds; slower than this it is down, and the list on the site stays. */
export const CITY_SOURCE_TIMEOUT_MS = 30_000;
