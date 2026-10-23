import type { SNSClient } from '@aws-sdk/client-sns';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Types for the cost limits of D-52 (metered-call.ts).

export interface CostGuard {
  readonly db: DynamoDBDocumentClient;
  readonly sns: SNSClient;
  /** The `daily_counters` table (DATA.md). */
  readonly tableName: string;
  /** Where the breaker's alert goes (infra/app/cost-limits.tf). */
  readonly alertTopicArn: string;
}

/** `deferred`: the breaker has tripped, so save the content pending and check it after the reset. */
export type Metered<T> =
  | { readonly outcome: 'done'; readonly value: T }
  | { readonly outcome: 'deferred' };
