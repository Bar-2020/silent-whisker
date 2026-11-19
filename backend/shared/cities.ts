import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { CITY_CODES_CACHE_SECONDS, CITY_FILES_FOLDER } from '../../shared/constants/cities';
import { MS_PER_SECOND } from '../../shared/constants/cost';
import { parseCityCodes } from '../../shared/schemas/city-names.schema';

/** The city list could not be read from the site's bucket (nothing uploaded yet, or S3 is down). */
export class CityListUnavailable extends Error {}

interface ReadCodes {
  readonly codes: ReadonlySet<number>;
  readonly readAt: number;
}

// One read per running function and hour: the codes change when someone uploads a new list (D-117).
const cache: { latest?: ReadCodes } = {};

async function readCodes(s3: S3Client, bucket: string, now: number): Promise<ReadonlySet<number>> {
  if (cache.latest && now - cache.latest.readAt < CITY_CODES_CACHE_SECONDS * MS_PER_SECOND) {
    return cache.latest.codes;
  }
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: `${CITY_FILES_FOLDER}/en.json` })
    );
    const codes = parseCityCodes((await Body?.transformToString()) ?? '');
    cache.latest = { codes, readAt: now };
    return codes;
  } catch (error) {
    throw new CityListUnavailable('The city list could not be read', { cause: error });
  }
}

/** Whether this code is on the list the app shows (D-117); the list is the file of the site's bucket. */
export async function isListedCity(
  s3: S3Client,
  bucket: string,
  code: number,
  now: Date
): Promise<boolean> {
  return (await readCodes(s3, bucket, now.getTime())).has(code);
}
