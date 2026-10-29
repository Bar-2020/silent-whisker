import type { SNSClient } from '@aws-sdk/client-sns';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface CostGuard {
  readonly db: DynamoDBDocumentClient;
  readonly sns: SNSClient;
  /** The `daily_usage_counters` table (DATA.md). */
  readonly tableName: string;
  /** Where the breaker's alert goes (infra/app/cost-limits.tf). */
  readonly alertTopicArn: string;
}

/** What one Lambda instance knows about the breaker on one UTC day, to spare the database. */
export interface BreakerMemory {
  readonly day: string;
  /** The smallest cost the breaker refused today: today's total only grows, so a cost this big or bigger is refused too. */
  readonly smallestRefused: number;
  /** The owner's alert is handled for today, sent by this instance or another. */
  readonly alerted: boolean;
}

/** `deferred`: the breaker has tripped, so save the content pending and check it after the reset. */
export type Metered<T> =
  | { readonly outcome: 'done'; readonly value: T }
  | { readonly outcome: 'deferred' };
