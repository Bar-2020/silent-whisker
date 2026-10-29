import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/** A `geocode_cache` row without its key (DATA.md). */
export interface Place {
  readonly lat: number;
  readonly lng: number;
  readonly place: string;
}

export interface GeocodeDeps {
  readonly db: DynamoDBDocumentClient;
  /** The `geocode_cache` table. */
  readonly cacheTable: string;
  /** The `daily_usage_counters` table, which holds the one-request-a-second slots. */
  readonly counterTable: string;
  /** Given by tests; the real ones are used when left out. */
  readonly fetch?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => Date;
}

/** The parts of a Nominatim hit this app reads. */
export interface NominatimHit {
  readonly lat?: string;
  readonly lon?: string;
  readonly display_name?: string;
}
