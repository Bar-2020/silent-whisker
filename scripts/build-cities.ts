// Builds the city files from the government's list of localities in Hebrew, English, Arabic and
// Russian (data.gov.il, "יישובים ומדינות", National Digital Agency; D-117) and puts them where the
// app reads them. By hand, from a computer in Israel (the source may refuse other countries):
//   npm run cities:upload   builds them and uploads them to the site's S3 bucket (needs the AWS login:
//                           set AWS_PROFILE to the project's profile first)
//   npm run cities:local    writes them to frontend/public/cities/ for `npm run dev` (not committed)
// The bucket is found by its name, or set `SITE_BUCKET`. Nothing here runs by itself.
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { CITY_FILES_FOLDER, CITY_LIST_MIN_PLACES } from '../shared/constants/cities.ts';
import { LANGUAGES } from '../shared/constants/languages.ts';
import { parseCityCodes } from '../shared/schemas/city-names.schema.ts';
import { govCityListSchema } from '../shared/schemas/gov-city-list.schema.ts';
import { buildCityFiles, checkCityFiles } from './city-files.ts';
import type { CityRow } from './city-files.ts';

const SOURCE =
  'https://data.gov.il/api/3/action/datastore_search?resource_id=e9701dcb-9f1c-43bb-bd44-eb380ade542f&limit=5000';
const LOCAL_FOLDER = new URL('../frontend/public/cities/', import.meta.url);
const SITE_BUCKET_PREFIX = 'silent-whisker-site-';
const MODE = process.argv[2];
const s3 = new S3Client({});

async function findSiteBucket(): Promise<string> {
  if (process.env.SITE_BUCKET) return process.env.SITE_BUCKET;
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  const names = Buckets.flatMap(({ Name }) => (Name?.startsWith(SITE_BUCKET_PREFIX) ? [Name] : []));
  if (names.length !== 1) {
    throw new Error('Could not find exactly one site bucket: set SITE_BUCKET to its name');
  }
  return names[0];
}

/** The codes of the list now on the site, or none when nothing was uploaded yet. */
async function currentCodes(bucket: string): Promise<Set<number>> {
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: `${CITY_FILES_FOLDER}/en.json` })
    );
    return parseCityCodes((await Body?.transformToString()) ?? '');
  } catch {
    return new Set();
  }
}

const text = (rows: readonly CityRow[]): string =>
  '[\n' + rows.map((row) => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n';

if (MODE !== '--upload' && MODE !== '--local') {
  throw new Error('Use `npm run cities:upload` or `npm run cities:local`');
}

const response = await fetch(SOURCE, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!response.ok) throw new Error(`The list answered ${response.status}`);
const { result } = govCityListSchema.parse(await response.json());
const files = buildCityFiles(
  result.records,
  LANGUAGES.map(({ code }) => code)
);
const places = Object.values(files).at(0)?.length ?? 0;

if (MODE === '--local') {
  checkCityFiles(files, new Set(), CITY_LIST_MIN_PLACES);
  mkdirSync(LOCAL_FOLDER, { recursive: true });
  for (const [language, rows] of Object.entries(files)) {
    writeFileSync(new URL(`${language}.json`, LOCAL_FOLDER), text(rows));
  }
  console.log(`${places} places written to frontend/public/cities/`);
} else {
  const bucket = await findSiteBucket();
  checkCityFiles(files, await currentCodes(bucket), CITY_LIST_MIN_PLACES);
  for (const [language, rows] of Object.entries(files)) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${CITY_FILES_FOLDER}/${language}.json`,
        Body: text(rows),
        ContentType: 'application/json',
      })
    );
  }
  console.log(`${places} places uploaded to s3://${bucket}/${CITY_FILES_FOLDER}/`);
}
