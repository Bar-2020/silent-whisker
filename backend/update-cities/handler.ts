import { S3Client } from '@aws-sdk/client-s3';
import { refreshCityList, s3CityListSite } from '../../shared/city-list-update';
import { readSettings } from '../shared/env';
import { updateCitiesSettings } from '../shared/schemas/settings.schema';

// Once a month (EventBridge Scheduler, infra/app/update-cities.tf, D-117): reads the government's list
// of localities and replaces the city files of the site's bucket, if the new list passes the checks.
// Any failure throws, so the function's error alarm emails the owner and the list on the site stays.

const s3 = new S3Client({});

export async function handler(): Promise<{ places: number }> {
  const { SITE_BUCKET } = readSettings(updateCitiesSettings);
  return refreshCityList(s3CityListSite(s3, SITE_BUCKET));
}
