import { PublishCommand } from '@aws-sdk/client-sns';
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  BREAKER_DAILY_MICRO_USD,
  COUNTER_TTL_SECONDS,
  MICRO_USD_PER_USD,
  MS_PER_SECOND,
} from '../../src/constants/cost';
import type { CostGuard, Metered } from './metered-call.types';

// The cost limits of D-51. Every paid AWS call goes through `meteredCall` (R-05); every paid
// action also takes a per-member allowance with `takeDailyAllowance` when it starts.

/** Counters reset at midnight UTC, whatever the member's time zone (R-06). */
const utcDay = (now: Date): string => now.toISOString().split('T')[0];

const expiresAt = (now: Date): number =>
  Math.floor(now.getTime() / MS_PER_SECOND) + COUNTER_TTL_SECONDS;

const isConditionFailure = (error: unknown): boolean =>
  error instanceof Error && error.name === 'ConditionalCheckFailedException';

/**
 * The UTC day this Lambda instance already knows the alert is handled for, per guard. While the
 * breaker is tripped every deferred call would otherwise write the marker again, and a failed
 * conditional write still uses write capacity, just when traffic peaks.
 */
const alertHandledDay = new WeakMap<CostGuard, string>();

/**
 * Adds `amount` to today's `name` counter only if the total stays within `max`, in one
 * conditional write, so two requests at once cannot both pass. Returns false and adds nothing
 * when it would go over. Any other failure throws: no allowance is ever assumed.
 */
export async function takeDailyAllowance(
  guard: CostGuard,
  name: string,
  amount: number,
  max: number
): Promise<boolean> {
  if (amount > max) return false;
  const now = new Date();
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
    if (isConditionFailure(error)) return false;
    throw error;
  }
}

/**
 * Emails the owner the first time the breaker trips on a UTC day. A marker row makes it once a
 * day across all Lambda instances. Any failure here is logged, never thrown: the content still
 * waits pending (never refused for cost), and the AWS Budget remains as a backup alarm.
 */
async function alertOncePerDay(guard: CostGuard): Promise<void> {
  const now = new Date();
  const day = utcDay(now);
  if (alertHandledDay.get(guard) === day) return;
  const marker = { key: `breaker_alert#${day}` };
  try {
    await guard.db.send(
      new PutCommand({
        TableName: guard.tableName,
        Item: { ...marker, expires_at: expiresAt(now) },
        ConditionExpression: 'attribute_not_exists(#key)',
        ExpressionAttributeNames: { '#key': 'key' },
      })
    );
  } catch (error) {
    if (isConditionFailure(error)) alertHandledDay.set(guard, day); // another instance sent it
    else console.error('cost alert marker failed', error);
    return;
  }
  const limitUsd = BREAKER_DAILY_MICRO_USD / MICRO_USD_PER_USD;
  try {
    // An operator email, not app UI, so it is plain English rather than a t() string.
    await guard.sns.send(
      new PublishCommand({
        TopicArn: guard.alertTopicArn,
        Subject: 'Silent Whisker: cost circuit breaker tripped',
        Message:
          `Paid checks passed $${String(limitUsd)} on ${day} (UTC). New photos and messages now ` +
          'wait, hidden, and are checked after midnight UTC. Look for abuse or a bug (D-51).',
      })
    );
    alertHandledDay.set(guard, day);
  } catch (error) {
    console.error('cost alert email failed', error);
    // Free the marker so the next deferred call retries the email.
    await guard.db
      .send(new DeleteCommand({ TableName: guard.tableName, Key: marker }))
      .catch((deleteError: unknown) => {
        console.error('cost alert marker cleanup failed', deleteError);
      });
  }
}

/**
 * Runs a paid AWS call if today's spending leaves room for its cost, after adding the cost to
 * the day's total (R-05, D-51). Once the breaker has tripped, it does not run the call and answers
 * `deferred`: the caller saves the content pending, hidden (R-04), for the check after the reset.
 */
export async function meteredCall<T>(
  guard: CostGuard,
  costMicroUsd: number,
  call: () => Promise<T>
): Promise<Metered<T>> {
  if (!(await takeDailyAllowance(guard, 'breaker', costMicroUsd, BREAKER_DAILY_MICRO_USD))) {
    await alertOncePerDay(guard);
    return { outcome: 'deferred' };
  }
  return { outcome: 'done', value: await call() };
}
