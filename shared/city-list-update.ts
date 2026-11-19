// How the city list is replaced (D-117), for the monthly job (`backend/update-cities`) and for
// `npm run cities:upload` / `cities:local` (`scripts/build-cities.ts`): read the government's list,
// build the files, check them against the list now on the site, write them. Imports carry their
// `.ts` extension because Node runs this file as it is for the script.
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { buildCityFiles, checkCityFiles, cityFileText } from './city-files.ts';
import {
  CITY_FILES_FOLDER,
  CITY_LIST_MIN_PLACES,
  CITY_SOURCE_TIMEOUT_MS,
  CITY_SOURCE_URL,
} from './constants/cities.ts';
import { LANGUAGES } from './constants/languages.ts';
import { parseCityCodes } from './schemas/city-names.schema.ts';
import { govCityListSchema } from './schemas/gov-city-list.schema.ts';

/** Where the files go: the codes of the list there now, and a file of text. */
export interface CityListSite {
  readonly currentCodes: () => Promise<Set<number>>;
  readonly write: (language: string, text: string) => Promise<void>;
}

/** The `cities/` folder of the site's bucket; no list before the first upload. */
export function s3CityListSite(s3: S3Client, bucket: string): CityListSite {
  return {
    currentCodes: async () => {
      try {
        const { Body } = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: `${CITY_FILES_FOLDER}/en.json` })
        );
        return parseCityCodes((await Body?.transformToString()) ?? '');
      } catch (error) {
        if (error instanceof NoSuchKey) return new Set();
        throw error;
      }
    },
    write: async (language, text) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${CITY_FILES_FOLDER}/${language}.json`,
          Body: text,
          ContentType: 'application/json',
          // The edge asks again each time, so a new list shows within seconds, not a day.
          CacheControl: 'no-cache',
        })
      );
    },
  };
}

/** The government's records, or an error when the source is down or answers something else. */
async function fetchRecords() {
  const response = await fetch(CITY_SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(CITY_SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`The city list source answered ${response.status}`);
  return govCityListSchema.parse(await response.json()).result.records;
}

/** Replaces the list on `site` with the government's current one, if it passes the checks; throws otherwise and writes nothing. */
export async function refreshCityList(site: CityListSite): Promise<{ places: number }> {
  const files = buildCityFiles(
    await fetchRecords(),
    LANGUAGES.map(({ code }) => code)
  );
  checkCityFiles(files, await site.currentCodes(), CITY_LIST_MIN_PLACES);
  // `en` last: the server accepts a code only when it is in that file, so a run that fails half way
  // never leaves a place the app shows and the server refuses.
  const order = Object.entries(files).sort(([a], [b]) => Number(a === 'en') - Number(b === 'en'));
  for (const [language, rows] of order) {
    await site.write(language, cityFileText(rows));
  }
  return { places: files.he.length };
}
