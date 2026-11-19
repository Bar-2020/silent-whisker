import type { S3Client } from '@aws-sdk/client-s3';
import { readCityCodes } from '../../shared/city-list-update';

/** The city list could not be read from the site's bucket (nothing uploaded yet, or S3 is down). */
export class CityListUnavailable extends Error {}

/**
 * Whether this code is on the list the app shows (D-117): the file `cities/en.json` of the site's
 * bucket, read at each save that carries a city (a few a member, ever).
 */
export async function isListedCity(s3: S3Client, bucket: string, code: number): Promise<boolean> {
  try {
    return (await readCityCodes(s3, bucket)).has(code);
  } catch (error) {
    throw new CityListUnavailable('The city list could not be read', { cause: error });
  }
}
