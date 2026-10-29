import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  GEOCODER_LANGUAGES,
  GEOCODER_SLOT_TRIES,
  GEOCODER_USER_AGENT,
} from '../../shared/constants/geocode';
import { GeocoderUnavailable, lookupPlace, normaliseQuery } from './geocode';
import type { GeocodeDeps, Place } from './geocode.types';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-north-1' }));
const dbMock = mockClient(db);

const CACHE = 'geocode_cache';
const COUNTERS = 'daily_usage_counters';
const NOW = new Date('2026-10-29T12:00:00.250Z');
const SECOND = Math.floor(NOW.getTime() / 1000);

const HAIFA: Place = { lat: 32.79, lng: 34.99, place: 'חיפה, ישראל' };
const hits = [{ lat: '32.79', lon: '34.99', display_name: HAIFA.place }];

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

const fetchMock = vi.fn<typeof fetch>();
const sleepMock = vi.fn<(ms: number) => Promise<void>>();

const deps: GeocodeDeps = {
  db,
  cacheTable: CACHE,
  counterTable: COUNTERS,
  fetch: fetchMock,
  sleep: sleepMock,
  now: () => NOW,
};

const putsTo = (table: string) =>
  dbMock.commandCalls(PutCommand).filter((call) => call.args[0].input.TableName === table);

beforeEach(() => {
  dbMock.reset();
  fetchMock.mockReset();
  sleepMock.mockReset().mockResolvedValue();
  dbMock.on(GetCommand).resolves({});
  dbMock.on(PutCommand).resolves({});
});

describe('normaliseQuery', () => {
  it.each([
    ['  Haifa ', 'haifa'],
    ['Tel   Aviv', 'tel aviv'],
    ['תל   אביב ', 'תל אביב'],
  ])('turns %j into %j, so the same city is one cache row', (typed, key) => {
    expect(normaliseQuery(typed)).toBe(key);
  });
});

describe('lookupPlace asks the cache first (D-29: no question is sent twice)', () => {
  it('answers from the cache with no request and no slot', async () => {
    dbMock.on(GetCommand).resolves({ Item: { query: 'haifa', ...HAIFA } });

    const found = await lookupPlace(deps, 'Haifa');

    expect(found).toEqual(HAIFA);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('looks the cache up by the normalised text', async () => {
    await lookupPlace(deps, '  HAIFA ').catch(() => undefined);

    const [read] = dbMock.commandCalls(GetCommand);
    expect(read.args[0].input).toMatchObject({ TableName: CACHE, Key: { query: 'haifa' } });
  });

  it('makes no second request for a city it has already found', async () => {
    const saved = new Map<string, Record<string, unknown>>();
    dbMock.on(GetCommand).callsFake((input: { Key: { query: string } }) => ({
      Item: saved.get(input.Key.query),
    }));
    dbMock.on(PutCommand, { TableName: CACHE }).callsFake((input: { Item: { query: string } }) => {
      saved.set(input.Item.query, input.Item);
      return {};
    });
    fetchMock.mockResolvedValue(answer(hits));

    const first = await lookupPlace(deps, 'Haifa');
    const second = await lookupPlace(deps, ' haifa');

    expect(first).toEqual(HAIFA);
    expect(second).toEqual(HAIFA);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns nothing for empty text, without a single call', async () => {
    expect(await lookupPlace(deps, '   ')).toBeUndefined();

    expect(dbMock.calls()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('lookupPlace asks Nominatim on a miss (D-29)', () => {
  it('names the app, asks for Hebrew first, and saves the answer', async () => {
    fetchMock.mockResolvedValue(answer(hits));

    const found = await lookupPlace(deps, 'Haifa');

    expect(found).toEqual(HAIFA);
    const [[url, init]] = fetchMock.mock.calls;
    const asked = (url as URL).searchParams;
    expect(asked.get('q')).toBe('haifa');
    expect(asked.get('accept-language')).toBe(GEOCODER_LANGUAGES);
    expect(asked.get('limit')).toBe('1');
    expect(init?.headers).toEqual({ 'user-agent': GEOCODER_USER_AGENT });
    expect(putsTo(CACHE)[0].args[0].input.Item).toEqual({ query: 'haifa', ...HAIFA });
  });

  it('says no such place when Nominatim finds none, and saves nothing', async () => {
    fetchMock.mockResolvedValue(answer([]));

    expect(await lookupPlace(deps, 'Atlantis')).toBeUndefined();

    expect(putsTo(CACHE)).toHaveLength(0);
  });
});

describe('one request a second for the whole app (D-87)', () => {
  it('takes the slot of the current second before it asks', async () => {
    fetchMock.mockResolvedValue(answer(hits));

    await lookupPlace(deps, 'Haifa');

    const [slot] = putsTo(COUNTERS);
    expect(slot.args[0].input).toMatchObject({
      Item: { key: `geocoder#${String(SECOND)}` },
      ConditionExpression: 'attribute_not_exists(#key)',
    });
  });

  it('waits for the next second when another instance holds this one', async () => {
    dbMock.on(PutCommand, { TableName: COUNTERS }).rejectsOnce(conditionFailed()).resolves({});
    fetchMock.mockResolvedValue(answer(hits));

    const found = await lookupPlace(deps, 'Haifa');

    expect(found).toEqual(HAIFA);
    expect(sleepMock).toHaveBeenCalledExactlyOnceWith(750);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up without asking when no slot comes free', async () => {
    dbMock.on(PutCommand, { TableName: COUNTERS }).rejects(conditionFailed());

    await expect(lookupPlace(deps, 'Haifa')).rejects.toBeInstanceOf(GeocoderUnavailable);

    expect(putsTo(COUNTERS)).toHaveLength(GEOCODER_SLOT_TRIES);
    expect(sleepMock).toHaveBeenCalledTimes(GEOCODER_SLOT_TRIES - 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not hide a database failure as a taken slot', async () => {
    dbMock.on(PutCommand, { TableName: COUNTERS }).rejects(new Error('table gone'));

    await expect(lookupPlace(deps, 'Haifa')).rejects.toThrow('table gone');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('lookupPlace when the geocoder fails (D-87)', () => {
  it.each([
    ['answers with an error status', () => answer({}, 500)],
    ['refuses with 429', () => answer({}, 429)],
    ['answers with something that is not a list', () => answer({ error: 'x' })],
    ['answers with a hit that has no point', () => answer([{ display_name: 'Haifa' }])],
    ['answers with text that is not JSON', () => new Response('<html>', { status: 200 })],
  ])('is unavailable when it %s, and saves nothing', async (_name, reply) => {
    fetchMock.mockResolvedValue(reply());

    await expect(lookupPlace(deps, 'Haifa')).rejects.toBeInstanceOf(GeocoderUnavailable);

    expect(putsTo(CACHE)).toHaveLength(0);
  });

  it('is unavailable when it cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(lookupPlace(deps, 'Haifa')).rejects.toBeInstanceOf(GeocoderUnavailable);
  });
});
