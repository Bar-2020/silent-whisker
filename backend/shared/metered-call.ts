import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PublishCommand } from '@aws-sdk/client-sns';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  BREAKER_DAILY_MICRO_USD,
  COUNTER_TTL_SECONDS,
  MICRO_USD_PER_USD,
  MS_PER_SECOND,
} from '../../shared/constants/cost';
import type { BreakerMemory, CostGuard, Metered } from './metered-call.types';

// The cost limits of D-52. Every paid AWS call goes through `meteredCall` (R-05); every paid
// action also takes a per-member allowance with `takeDailyAllowance` when it starts.

/** Counters reset at midnight UTC, whatever the member's time zone (R-06). */
const utcDay = (now: Date): string => now.toISOString().split('T')[0];

const expiresAt = (now: Date): number =>
  Math.floor(now.getTime() / MS_PER_SECOND) + COUNTER_TTL_SECONDS;

/**
 * What this instance knows about today's breaker, so a tripped breaker does not make every deferred
 * call write again (a refused conditional write still uses write capacity, just at peak traffic).
 * Keyed by the topic, not the guard object, so a handler that builds a new guard per request still
 * hits it.
 */
const breakerMemory = new Map<string, BreakerMemory>();

const memoryOf = (guard: CostGuard, today: string): BreakerMemory => {
  const known = breakerMemory.get(guard.alertTopicArn);
  return known?.day === today ? known : { day: today, smallestRefused: Infinity, alerted: false };
};

/** Whole micro-dollars keep sums exact; zero or less would un-count spending. */
function assertPositiveWhole(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new RangeError(`An amount must be a positive whole number, got ${String(amount)}`);
  }
}

/**
 * Adds `amount` to today's `name` counter if the total stays within `max`, in one conditional write
 * so two requests at once cannot both pass. Returns false when it would go over; any other failure
 * throws: no allowance is ever assumed.
 */
export async function takeDailyAllowance(
  guard: CostGuard,
  name: string,
  amount: number,
  max: number,
  now = new Date()
): Promise<boolean> {
  assertPositiveWhole(amount);
  if (amount > max) return false;
  try {
    await guard.db.send(
      new UpdateCommand({
        TableName: guard.tableName,
        Key: { key: `${name}#${utcDay(now)}` },
        UpdateExpression: 'ADD #count :amount SET expires_at = if_not_exists(expires_at, :expires)',
        ConditionExpression: 'attribute_not_exists(#count) OR #count <= :room',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {
          ':amount': amount,
          ':room': max - amount,
          ':expires': expiresAt(now),
        },
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

/**
 * A marker row makes the email once a UTC day across all Lambda instances. Failures are logged,
 * never thrown: the content still waits pending (never refused for cost), and the AWS Budget is the
 * backup alarm. If the email itself fails, that day's alert is lost: retrying would need every
 * instance to retry.
 */
async function alertOncePerDay(guard: CostGuard, now: Date): Promise<void> {
  const today = utcDay(now);
  if (memoryOf(guard, today).alerted) return;
  let sentElsewhere = false;
  try {
    await guard.db.send(
      new PutCommand({
        TableName: guard.tableName,
        Item: { key: `breaker_alert#${today}`, expires_at: expiresAt(now) },
        ConditionExpression: 'attribute_not_exists(#key)',
        ExpressionAttributeNames: { '#key': 'key' },
      })
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      console.error('cost alert marker failed', error);
      return;
    }
    sentElsewhere = true;
  }
  breakerMemory.set(guard.alertTopicArn, { ...memoryOf(guard, today), alerted: true });
  if (sentElsewhere) return;
  const limitUsd = BREAKER_DAILY_MICRO_USD / MICRO_USD_PER_USD;
  try {
    // An operator email, not app UI, so it is plain English rather than a t() string.
    await guard.sns.send(
      new PublishCommand({
        TopicArn: guard.alertTopicArn,
        Subject: 'Silent Whisker: cost circuit breaker tripped',
        Message:
          `Paid checks passed $${String(limitUsd)} on ${today} (UTC). New photos and messages now ` +
          'wait, hidden, and are checked after midnight UTC. Look for abuse or a bug (D-52).',
      })
    );
  } catch (error) {
    console.error('cost alert email failed', error);
  }
}

/**
 * Counts the cost before the call runs (R-05, D-52). Once the breaker has tripped it answers
 * `deferred`: the caller saves the content pending, hidden (R-04), for the check after the reset.
 */
export async function meteredCall<T>(
  guard: CostGuard,
  costMicroUsd: number,
  call: () => Promise<T>
): Promise<Metered<T>> {
  assertPositiveWhole(costMicroUsd);
  const now = new Date(); // one reading, so the refusal and the alert are about the same UTC day
  const today = utcDay(now);
  const refusedBefore = costMicroUsd >= memoryOf(guard, today).smallestRefused;
  if (
    refusedBefore ||
    !(await takeDailyAllowance(guard, 'breaker', costMicroUsd, BREAKER_DAILY_MICRO_USD, now))
  ) {
    const memory = memoryOf(guard, today);
    breakerMemory.set(guard.alertTopicArn, {
      ...memory,
      smallestRefused: Math.min(memory.smallestRefused, costMicroUsd),
    });
    await alertOncePerDay(guard, now);
    return { outcome: 'deferred' };
  }
  return { outcome: 'done', value: await call() };
}
