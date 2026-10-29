import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { COUNTER_TTL_SECONDS, MS_PER_SECOND } from '../../shared/constants/cost';
import {
  GEOCODER_LANGUAGES,
  GEOCODER_SLOT_MS,
  GEOCODER_SLOT_TRIES,
  GEOCODER_TIMEOUT_MS,
  GEOCODER_URL,
  GEOCODER_USER_AGENT,
} from '../../shared/constants/geocode';
import type { GeocodeDeps, NominatimHit, Place } from './geocode.types';

/** The geocoder cannot be reached, is too busy, or gave an answer this app does not understand. */
export class GeocoderUnavailable extends Error {}

type Live = Required<GeocodeDeps>;

const withDefaults = (deps: GeocodeDeps): Live => ({
  fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  ...deps,
});

export const normaliseQuery = (text: string): string =>
  text.normalize('NFC').trim().replaceAll(/\s+/gu, ' ').toLowerCase();

async function readCache(deps: Live, query: string): Promise<Place | undefined> {
  const { Item } = await deps.db.send(
    new GetCommand({ TableName: deps.cacheTable, Key: { query } })
  );
  const hit = Item as Place | undefined;
  return hit && { lat: hit.lat, lng: hit.lng, place: hit.place };
}

/** One row per second, written only if absent, so every instance together sends one request a second (D-87). */
async function takeSlot(deps: Live, nowMs: number): Promise<boolean> {
  const second = Math.floor(nowMs / MS_PER_SECOND);
  try {
    await deps.db.send(
      new PutCommand({
        TableName: deps.counterTable,
        Item: { key: `geocoder#${String(second)}`, expires_at: second + COUNTER_TTL_SECONDS },
        ConditionExpression: 'attribute_not_exists(#key)',
        ExpressionAttributeNames: { '#key': 'key' },
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

async function waitForSlot(deps: Live): Promise<void> {
  for (let attempt = 0; attempt < GEOCODER_SLOT_TRIES; attempt += 1) {
    const nowMs = deps.now().getTime();
    if (await takeSlot(deps, nowMs)) return;
    if (attempt < GEOCODER_SLOT_TRIES - 1)
      await deps.sleep(GEOCODER_SLOT_MS - (nowMs % GEOCODER_SLOT_MS));
  }
  throw new GeocoderUnavailable('No geocoder slot was free in time');
}

async function fetchHits(deps: Live, query: string): Promise<unknown> {
  const url = new URL(GEOCODER_URL);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    'accept-language': GEOCODER_LANGUAGES,
  }).toString();
  try {
    const response = await deps.fetch(url, {
      headers: { 'user-agent': GEOCODER_USER_AGENT },
      signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new GeocoderUnavailable(`The geocoder answered ${String(response.status)}`);
    return await response.json();
  } catch (error) {
    if (error instanceof GeocoderUnavailable) throw error;
    throw new GeocoderUnavailable('The geocoder could not be reached', { cause: error });
  }
}

/** No hit is a normal answer (undefined); a shape this app does not know is an outage. */
function placeFrom(hits: unknown): Place | undefined {
  if (!Array.isArray(hits)) throw new GeocoderUnavailable('The geocoder answer was not a list');
  if (hits.length === 0) return undefined;
  const [hit] = hits as NominatimHit[];
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !hit.display_name) {
    throw new GeocoderUnavailable('The geocoder answer had no point');
  }
  return { lat, lng, place: hit.display_name };
}

/**
 * The point of a typed place (D-29): the cache first, Nominatim only on a miss. A place the
 * geocoder does not know is `undefined` and is not saved, so typos never fill the cache (D-87).
 */
export async function lookupPlace(given: GeocodeDeps, text: string): Promise<Place | undefined> {
  const deps = withDefaults(given);
  const query = normaliseQuery(text);
  if (!query) return undefined;
  const cached = await readCache(deps, query);
  if (cached) return cached;
  await waitForSlot(deps);
  const place = placeFrom(await fetchHits(deps, query));
  if (place) {
    await deps.db.send(new PutCommand({ TableName: deps.cacheTable, Item: { query, ...place } }));
  }
  return place;
}
