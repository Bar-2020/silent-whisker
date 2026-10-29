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
}
