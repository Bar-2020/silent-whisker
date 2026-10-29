import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { COUNTER_TTL_SECONDS, MS_PER_SECOND } from '../../shared/constants/cost';
import {
  GEOCODER_LANGUAGES,
  GEOCODER_QUERY_MAX_LENGTH,
  GEOCODER_SLOT_MS,
  GEOCODER_SLOT_TRIES,
  GEOCODER_TIMEOUT_MS,
  GEOCODER_URL,
  GEOCODER_USER_AGENT,
} from '../../shared/constants/geocode';
import type { GeocodeDeps, Place } from './geocode.types';

/** The geocoder cannot be reached, is too busy, or gave an answer this app does not understand. */
export class GeocoderUnavailable extends Error {}

const normaliseQuery = (text: string): string =>
  text.normalize('NFC').trim().replaceAll(/\s+/gu, ' ').toLowerCase();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function readCache(deps: GeocodeDeps, query: string): Promise<Place | undefined> {
  const { Item } = await deps.db.send(
    new GetCommand({ TableName: deps.cacheTable, Key: { query } })
  );
  const hit = Item as Place | undefined;
  return hit && { lat: hit.lat, lng: hit.lng, place: hit.place };
}

/** One row per second, written only if absent, so every instance together sends one request a second (D-87). */
async function takeSlot(deps: GeocodeDeps, nowMs: number): Promise<boolean> {
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

async function waitForSlot(deps: GeocodeDeps): Promise<void> {
  for (let attempt = 0; attempt < GEOCODER_SLOT_TRIES; attempt += 1) {
    const nowMs = Date.now();
    if (await takeSlot(deps, nowMs)) return;
    if (attempt < GEOCODER_SLOT_TRIES - 1)
      await sleep(GEOCODER_SLOT_MS - (nowMs % GEOCODER_SLOT_MS));
  }
  throw new GeocoderUnavailable('No geocoder slot was free in time');
}

async function fetchHits(query: string): Promise<unknown> {
  const url = new URL(GEOCODER_URL);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    'accept-language': GEOCODER_LANGUAGES,
  }).toString();
  try {
    const response = await fetch(url, {
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

/** A hit with a point and a name, else nothing: the answer comes from outside, so every field is checked. */
function readHit(hit: unknown): Place | undefined {
  if (typeof hit !== 'object' || hit === null) return undefined;
  const { lat, lon, display_name: name } = hit as Record<string, unknown>;
  if (typeof lat !== 'string' || typeof lon !== 'string' || typeof name !== 'string') {
    return undefined;
  }
  const point = { lat: Number.parseFloat(lat), lng: Number.parseFloat(lon) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && name
    ? { ...point, place: name }
    : undefined;
}

/** No hit is a normal answer (undefined); a shape this app does not know is an outage. */
function placeFrom(hits: unknown): Place | undefined {
  if (!Array.isArray(hits)) throw new GeocoderUnavailable('The geocoder answer was not a list');
  if (hits.length === 0) return undefined;
  const place = readHit(hits[0]);
  if (!place) throw new GeocoderUnavailable('The geocoder answer had no point');
  return place;
}

/**
 * The point of a typed place (D-29): the cache first, Nominatim only on a miss. A place the
 * geocoder does not know is `undefined` and is not saved, so typos never fill the cache (D-87).
 */
export async function lookupPlace(deps: GeocodeDeps, text: string): Promise<Place | undefined> {
  const query = normaliseQuery(text);
  if (!query || query.length > GEOCODER_QUERY_MAX_LENGTH) return undefined;
  const cached = await readCache(deps, query);
  if (cached) return cached;
  await waitForSlot(deps);
  const place = placeFrom(await fetchHits(query));
  if (place) {
    await deps.db.send(new PutCommand({ TableName: deps.cacheTable, Item: { query, ...place } }));
  }
  return place;
}
