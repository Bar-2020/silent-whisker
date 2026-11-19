import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  CITY_FILES_FOLDER,
  CITY_LIST_MIN_PLACES,
  CITY_SOURCE_TIMEOUT_MS,
  CITY_SOURCE_URL,
} from '../../shared/constants/cities';
import { LANGUAGES } from '../../shared/constants/languages';
import type { handler as handlerOfModule } from './handler';

// INFRA-11, D-117: the monthly job that refreshes the city list, with a faked government source and a faked S3

const s3Mock = mockClient(S3Client);
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

const SITE_BUCKET = 'site-bucket';
const CODES = LANGUAGES.map(({ code }) => code);
const FILE_KEYS = CODES.map((code) => `${CITY_FILES_FOLDER}/${code}.json`).toSorted();
const LIST_KEY = `${CITY_FILES_FOLDER}/en.json`;

let handler: typeof handlerOfModule;

// ---- made-up government records and what the files must hold for them

const hasArabic = (code: number): boolean => code % 2 === 0;
const hasRussian = (code: number): boolean => code % 3 === 0;
const englishName = (code: number): string => `Place ${String(code)}`;

/** `count` records with codes 1 to `count`, newest first (the source does not send them in order): English in capitals. */
function recordsOf(count: number) {
  return Array.from({ length: count }, (_, at) => count - at).map((code) => ({
    symbol_number: code,
    name_in_hebrew: `מקום ${String(code)}`,
    name_in_english: englishName(code).toUpperCase(),
    name_in_arabic: hasArabic(code) ? `مكان ${String(code)}` : null,
    name_in_russian: hasRussian(code) ? `Место ${String(code)}` : null,
  }));
}

/** The rows of one file for the codes 1 to `count`: [code, name in that language, English name, 0 or 1]. */
function rowsOf(language: string, count: number): [number, string, string, number][] {
  return Array.from({ length: count }, (_, at) => at + 1).map((code) => {
    const english = englishName(code);
    const names: Record<string, string> = {
      he: `מקום ${String(code)}`,
      en: english,
      ar: hasArabic(code) ? `مكان ${String(code)}` : english,
      ru: hasRussian(code) ? `Место ${String(code)}` : english,
    };
    return [code, names[language], english, hasRussian(code) ? 1 : 0];
  });
}

const sourceAnswers = (count: number, status = 200): void => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ result: { records: recordsOf(count) } }), { status })
  );
};

// ---- the site's bucket

const bodyOfFile = (text: string): GetObjectCommandOutput['Body'] =>
  ({ transformToString: () => Promise.resolve(text) }) as unknown as GetObjectCommandOutput['Body'];

/** The list on the site: a file `cities/en.json` of the codes 1 to `count`, or none yet. */
function siteHolds(count: number | undefined): void {
  s3Mock.reset();
  s3Mock.on(PutObjectCommand).resolves({});
  if (count === undefined) {
    s3Mock.on(GetObjectCommand).rejects(new NoSuchKey({ message: 'no key', $metadata: {} }));
    return;
  }
  s3Mock.on(GetObjectCommand).resolves({ Body: bodyOfFile(JSON.stringify(rowsOf('en', count))) });
}

const writes = () => s3Mock.commandCalls(PutObjectCommand);
const reads = () => s3Mock.commandCalls(GetObjectCommand);

/** What one file was written with: its key, content type, cache control and rows. */
function writtenFiles(): Record<
  string,
  { type: string | undefined; cache: string | undefined; rows: unknown }
> {
  const files: Record<
    string,
    { type: string | undefined; cache: string | undefined; rows: unknown }
  > = {};
  for (const call of writes()) {
    const { Key, Body, ContentType, CacheControl, Bucket } = call.args[0].input;
    expect(Bucket).toBe(SITE_BUCKET);
    if (typeof Body !== 'string' || Key === undefined) throw new Error('a file has no text or key');
    files[Key] = { type: ContentType, cache: CacheControl, rows: JSON.parse(Body) as unknown };
  }
  return files;
}

/** The keys of the writes, in the order they were made. */
const writtenKeys = (): (string | undefined)[] => writes().map((call) => call.args[0].input.Key);

function expectGoodRun(places: number): void {
  const files = writtenFiles();
  expect(Object.keys(files).toSorted()).toEqual(FILE_KEYS);
  for (const code of CODES) {
    expect(files[`${CITY_FILES_FOLDER}/${code}.json`]).toEqual({
      type: 'application/json',
      // the browser rechecks a city file each visit (D-113, D-117)
      cache: 'no-cache',
      rows: rowsOf(code, places),
    });
  }
}

beforeEach(async () => {
  vi.resetModules();
  process.env.SITE_BUCKET = SITE_BUCKET;
  ({ handler } = await import('./handler'));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  sourceAnswers(CITY_LIST_MIN_PLACES);
  siteHolds(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** After a failure the next run, with everything right again, works and writes the four files (INFRA-11). */
async function expectNextRunWorks(): Promise<void> {
  fetchMock.mockReset();
  sourceAnswers(CITY_LIST_MIN_PLACES);
  siteHolds(undefined);
  vi.stubGlobal('fetch', fetchMock);

  await expect(handler()).resolves.toEqual({ places: CITY_LIST_MIN_PLACES });
  expect(writes()).toHaveLength(CODES.length);
}

describe('a good run (INFRA-11, D-117)', () => {
  // INFRA-11, D-117
  it('writes the four city files of the site bucket and answers the number of places, with no list on the site yet', async () => {
    const result = await handler();

    expect(result).toEqual({ places: CITY_LIST_MIN_PLACES });
    expectGoodRun(CITY_LIST_MIN_PLACES);
  });

  // INFRA-11, D-117
  it('works over a list that holds only some of the places, and over one with every code and more', async () => {
    siteHolds(CITY_LIST_MIN_PLACES - 1);
    const more = CITY_LIST_MIN_PLACES + 1;
    sourceAnswers(more);

    await expect(handler()).resolves.toEqual({ places: more });
    expectGoodRun(more);
  });

  // INFRA-11, D-117
  it('works over the same list, again', async () => {
    siteHolds(CITY_LIST_MIN_PLACES);

    await expect(handler()).resolves.toEqual({ places: CITY_LIST_MIN_PLACES });
    expectGoodRun(CITY_LIST_MIN_PLACES);
  });

  // INFRA-11, D-117
  it('writes cities/en.json last: the server reads that file, so it never gets a code the other files lack', async () => {
    await handler();

    expect(writtenKeys()).toHaveLength(CODES.length);
    expect(writtenKeys().at(-1)).toBe(LIST_KEY);
  });

  // INFRA-11, D-117
  it('reads the source at its address with a User-Agent and a way to give up', async () => {
    await handler();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(CITY_SOURCE_URL);
    expect(new Headers(init?.headers).get('user-agent')).toBeTruthy();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  // INFRA-11, D-117
  it('reads the list now on the site from cities/en.json of the site bucket', async () => {
    await handler();

    expect(reads()).toHaveLength(1);
    expect(reads()[0].args[0].input).toEqual({ Bucket: SITE_BUCKET, Key: LIST_KEY });
  });

  // INFRA-11, D-117
  it('writes the rows in order of code with the English name in words and the better-known mark', async () => {
    sourceAnswers(CITY_LIST_MIN_PLACES);

    await handler();

    const files = writtenFiles();
    const en = files[LIST_KEY].rows as [number, string, string, number][];
    expect(en[0]).toEqual([1, 'Place 1', 'Place 1', 0]);
    expect(en[2]).toEqual([3, 'Place 3', 'Place 3', 1]);
    expect(en.map(([code]) => code)).toEqual(en.map(([code]) => code).toSorted((a, b) => a - b));
  });
});

describe('the government source fails (INFRA-11, D-117)', () => {
  // INFRA-11, D-117
  it('throws for an answer of 500, naming the status, and writes nothing', async () => {
    sourceAnswers(CITY_LIST_MIN_PLACES, 500);

    await expect(handler()).rejects.toThrow('The city list source answered 500');

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it.each([
    ['an answer that is not JSON', () => new Response('<html>blocked</html>', { status: 200 })],
    ['JSON of another shape', () => new Response(JSON.stringify({ result: { records: 'x' } }))],
    ['JSON with no result', () => new Response(JSON.stringify({ records: [] }))],
    ['a record with no code', () => new Response(JSON.stringify({ result: { records: [{}] } }))],
  ])('throws for %s and writes nothing', async (_name, answer) => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(answer());

    await expect(handler()).rejects.toThrow();

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it('throws when the source cannot be reached, and writes nothing', async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(handler()).rejects.toThrow();

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it('throws when the source takes longer than the timeout, and writes nothing', async () => {
    // Either a timeout signal (AbortSignal.timeout) or a timer ends the wait: both are driven here.
    const timeout = new AbortController();
    const timeoutSignal = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('the request was aborted', { cause: init.signal?.reason }));
          });
        })
    );

    const run = expect(handler()).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(CITY_SOURCE_TIMEOUT_MS);
    timeout.abort(new DOMException('timed out', 'TimeoutError'));
    await run;

    if (timeoutSignal.mock.calls.length > 0) {
      expect(timeoutSignal).toHaveBeenCalledWith(CITY_SOURCE_TIMEOUT_MS);
    }
    expect(writes()).toHaveLength(0);
    vi.useRealTimers();
    await expectNextRunWorks();
  });
});

describe('the new list or the list on the site is not good (INFRA-11, D-117)', () => {
  // INFRA-11, D-117
  it('throws for fewer places than the minimum, naming the count, and writes nothing', async () => {
    const few = CITY_LIST_MIN_PLACES - 1;
    sourceAnswers(few);

    await expect(handler()).rejects.toThrow(
      `The new list has ${String(few)} places, fewer than ${String(CITY_LIST_MIN_PLACES)}`
    );

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it('throws for an empty list, and writes nothing', async () => {
    sourceAnswers(0);

    await expect(handler()).rejects.toThrow();

    expect(writes()).toHaveLength(0);
  });

  // INFRA-11, D-117
  it('throws for a list that lacks a code of the one on the site, naming how many, and writes nothing', async () => {
    // the site holds one place more than the source now sends
    siteHolds(CITY_LIST_MIN_PLACES + 1);

    await expect(handler()).rejects.toThrow(/lacks 1 codes? of the list on the site/);

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it('throws for an S3 error other than NoSuchKey when reading the list on the site, and writes nothing', async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(GetObjectCommand).rejects(new Error('S3 is down'));

    await expect(handler()).rejects.toThrow('S3 is down');

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });

  // INFRA-11, D-117
  it('throws when the list on the site is not valid rows, and writes nothing', async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(GetObjectCommand).resolves({ Body: bodyOfFile('not json') });

    await expect(handler()).rejects.toThrow();

    expect(writes()).toHaveLength(0);
    await expectNextRunWorks();
  });
});

describe('a write fails (INFRA-11, D-117)', () => {
  // INFRA-11, D-117
  it.each(CODES)(
    'throws when the write of the %s file fails, and the next run works',
    async (code) => {
      s3Mock.reset();
      s3Mock.on(GetObjectCommand).rejects(new NoSuchKey({ message: 'no key', $metadata: {} }));
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock
        .on(PutObjectCommand, { Key: `${CITY_FILES_FOLDER}/${code}.json` })
        .rejects(new Error('write refused'));

      await expect(handler()).rejects.toThrow('write refused');

      // the file the server reads is written last: when another one fails it was not written
      if (code !== 'en') expect(writtenKeys()).not.toContain(LIST_KEY);
      await expectNextRunWorks();
    }
  );

  // INFRA-11, D-117
  it.each(['he', 'ar', 'ru'])(
    'does not write cities/en.json when the write of %s fails, so the server list never runs ahead of the files',
    async (code) => {
      s3Mock.reset();
      s3Mock.on(GetObjectCommand).rejects(new NoSuchKey({ message: 'no key', $metadata: {} }));
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock
        .on(PutObjectCommand, { Key: `${CITY_FILES_FOLDER}/${code}.json` })
        .rejects(new Error('write refused'));

      await expect(handler()).rejects.toThrow('write refused');

      expect(writtenKeys()).not.toContain(LIST_KEY);
    }
  );
});
