// Puts the city files where the app reads them, from the government's list of localities in Hebrew,
// English, Arabic and Russian (data.gov.il, "יישובים ומדינות", National Digital Agency; D-117). By
// hand, from a computer in Israel (the source may refuse other countries):
//   npm run cities:upload   uploads them to the site's S3 bucket (needs the AWS login: set AWS_PROFILE
//                           to the project's profile first); the monthly job in AWS does the same
//   npm run cities:local    writes them to frontend/public/cities/ for `npm run dev` (not committed)
// The bucket is found by its name, or set `SITE_BUCKET`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { refreshCityList, s3CityListSite } from '../shared/city-list-update.ts';
import type { CityListSite } from '../shared/city-list-update.ts';

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

const localSite: CityListSite = {
  currentCodes: () => Promise.resolve(new Set()),
  write: (language, text) => {
    mkdirSync(LOCAL_FOLDER, { recursive: true });
    writeFileSync(new URL(`${language}.json`, LOCAL_FOLDER), text);
    return Promise.resolve();
  },
};

if (MODE !== '--upload' && MODE !== '--local') {
  throw new Error('Use `npm run cities:upload` or `npm run cities:local`');
}
const bucket = MODE === '--upload' ? await findSiteBucket() : undefined;
const { places } = await refreshCityList(bucket ? s3CityListSite(s3, bucket) : localSite);
console.log(
  bucket
    ? `${places} places uploaded to s3://${bucket}/cities/`
    : `${places} places written to frontend/public/cities/`
);
