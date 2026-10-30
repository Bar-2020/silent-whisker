import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BREAKER_DAILY_MICRO_USD, COUNTER_TTL_SECONDS } from '../../shared/constants/cost';
import {
  giveBackDailyAllowance,
  meteredCall,
  secondsUntilNextUtcDay,
  takeDailyAllowance,
} from './metered-call';
import type { CostGuard } from './metered-call.types';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-north-1' }));
const sns = new SNSClient({ region: 'eu-north-1' });
const dbMock = mockClient(db);
const snsMock = mockClient(sns);

const NOW = new Date('2026-10-21T12:00:00Z');

// A fresh alert topic per test, like a fresh Lambda instance: the once-a-day alert cache lives in
// the module, keyed by topic.
let guard: CostGuard;
let topicCount = 0;

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

beforeEach(() => {
  dbMock.reset();
  snsMock.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  topicCount += 1;
  guard = {
    db,
    sns,
    tableName: 'daily_usage_counters',
    alertTopicArn: `arn:aws:sns:eu-north-1:123456789012:cost-alerts-${String(topicCount)}`,
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('meteredCall (R-05: every paid call passes the global circuit breaker)', () => {
  it('runs the call and adds its cost to the day while there is room', async () => {
    dbMock.on(UpdateCommand).resolves({});
    const call = vi.fn().mockResolvedValue('checked');

    const result = await meteredCall(guard, 1500, call);

    expect(result).toEqual({ outcome: 'done', value: 'checked' });
    expect(call).toHaveBeenCalledOnce();
    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input).toMatchObject({
      TableName: 'daily_usage_counters',
      Key: { key: 'breaker#2026-10-21' },
      ConditionExpression: 'attribute_not_exists(#count) OR #count <= :room',
      ExpressionAttributeValues: { ':amount': 1500, ':room': BREAKER_DAILY_MICRO_USD - 1500 },
    });
  });

  it('once tripped, does not run the call and defers it instead of refusing', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});
    const call = vi.fn();

    const result = await meteredCall(guard, 1500, call);

    expect(result).toEqual({ outcome: 'deferred' });
    expect(call).not.toHaveBeenCalled();
  });

  it('emails the owner on the first trip of the day', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    await meteredCall(guard, 1500, vi.fn());

    const [marker] = dbMock.commandCalls(PutCommand);
    expect(marker.args[0].input).toMatchObject({
      Item: { key: 'breaker_alert#2026-10-21' },
      ConditionExpression: 'attribute_not_exists(#key)',
    });
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
    expect(snsMock.commandCalls(PublishCommand)[0].args[0].input.TopicArn).toBe(
      guard.alertTopicArn
    );
  });

  it('does not email again once another instance has alerted today', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).rejects(conditionFailed());

    const result = await meteredCall(guard, 1500, vi.fn());

    expect(result).toEqual({ outcome: 'deferred' });
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });

  // A new guard on every call, like a handler that builds one per request: the memory is by topic.
  it('writes the marker only once per instance while tripped, sparing write capacity', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    await meteredCall({ ...guard }, 1500, vi.fn());
    await meteredCall({ ...guard }, 1500, vi.fn());
    await meteredCall({ ...guard }, 1500, vi.fn());

    expect(dbMock.commandCalls(PutCommand)).toHaveLength(1);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
  });

  it('skips the counter for a cost the breaker already refused today, or a bigger one', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    await meteredCall(guard, 1500, vi.fn()); // refused by the database
    await meteredCall(guard, 1500, vi.fn()); // same cost: known refused
    await meteredCall(guard, 2000, vi.fn()); // bigger: known refused
    await meteredCall(guard, 1000, vi.fn()); // smaller: might still fit, so it asks
    await meteredCall(guard, 1200, vi.fn()); // refused at 1000 already, so skipped

    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(2);
  });

  it('forgets a refusal on the next UTC day', async () => {
    dbMock.on(UpdateCommand).rejectsOnce(conditionFailed()).resolves({});
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});
    const call = vi.fn().mockResolvedValue('checked');

    await meteredCall(guard, 1500, vi.fn());
    vi.setSystemTime(new Date('2026-10-22T00:00:01Z'));

    await expect(meteredCall(guard, 1500, call)).resolves.toEqual({
      outcome: 'done',
      value: 'checked',
    });
  });

  it('still defers when the alert email cannot be sent', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).rejects(new Error('SNS is down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(meteredCall(guard, 1500, vi.fn())).resolves.toEqual({ outcome: 'deferred' });
  });

  it('reads the clock once, so a refusal just before midnight alerts for the day it refused', async () => {
    vi.setSystemTime(new Date('2026-10-21T23:59:59.999Z'));
    dbMock.on(UpdateCommand).callsFake(() => {
      vi.setSystemTime(new Date('2026-10-22T00:00:00.001Z'));
      return Promise.reject(conditionFailed());
    });
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});

    await meteredCall(guard, 1500, vi.fn());

    const [marker] = dbMock.commandCalls(PutCommand);
    expect(marker.args[0].input.Item?.key).toBe('breaker_alert#2026-10-21');
  });

  it.each([0, -5, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects a cost of %s without asking the database or running the call',
    async (cost) => {
      const call = vi.fn();

      await expect(meteredCall(guard, cost, call)).rejects.toThrow(RangeError);
      expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
      expect(call).not.toHaveBeenCalled();
    }
  );

  it('still defers when the once-a-day marker cannot be written', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).rejects(new Error('DynamoDB is down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(meteredCall(guard, 1500, vi.fn())).resolves.toEqual({ outcome: 'deferred' });
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });

  it('counts the cost before the call, so a failed paid call is still counted', async () => {
    dbMock.on(UpdateCommand).resolves({});

    await expect(
      meteredCall(guard, 1500, () => Promise.reject(new Error('Bedrock failed')))
    ).rejects.toThrow('Bedrock failed');
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(1);
  });

  it('fails closed: if the counter cannot be written, the paid call never runs', async () => {
    dbMock.on(UpdateCommand).rejects(new Error('DynamoDB is down'));
    const call = vi.fn();

    await expect(meteredCall(guard, 1500, call)).rejects.toThrow('DynamoDB is down');
    expect(call).not.toHaveBeenCalled();
  });
});

describe('takeDailyAllowance (R-05: per-member limits and the breaker share one counter)', () => {
  it('counts a member action against their own limit for the day', async () => {
    dbMock.on(UpdateCommand).resolves({});

    await expect(takeDailyAllowance(guard, 'uploads#member-1', 1, 20)).resolves.toBe(true);

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input).toMatchObject({
      Key: { key: 'uploads#member-1#2026-10-21' },
      ExpressionAttributeValues: { ':amount': 1, ':room': 19 },
    });
  });

  it('refuses without writing when the limit is reached', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());

    await expect(takeDailyAllowance(guard, 'uploads#member-1', 1, 20)).resolves.toBe(false);
  });

  it('refuses an amount larger than the whole limit without asking the database', async () => {
    await expect(takeDailyAllowance(guard, 'breaker', 3, 2)).resolves.toBe(false);
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it.each([0, -5, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an amount of %s: it would un-count spending or break the exact sums',
    async (amount) => {
      await expect(takeDailyAllowance(guard, 'breaker', amount, 2)).rejects.toThrow(RangeError);
      expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
    }
  );

  it('keys the counter by the UTC day (R-06), not the local one', async () => {
    dbMock.on(UpdateCommand).resolves({});
    vi.setSystemTime(new Date('2026-10-21T23:30:00-03:00'));

    await takeDailyAllowance(guard, 'breaker', 1, 2);

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input.Key).toEqual({ key: 'breaker#2026-10-22' });
  });

  it('lets DynamoDB remove the row after the TTL', async () => {
    dbMock.on(UpdateCommand).resolves({});

    await takeDailyAllowance(guard, 'breaker', 1, 2);

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input.ExpressionAttributeValues?.[':expires']).toBe(
      NOW.getTime() / 1000 + COUNTER_TTL_SECONDS
    );
  });
});

describe('giveBackDailyAllowance (D-62: an action that never ran gives its unit back)', () => {
  it("takes the unit off today's counter, but only if the counter holds it", async () => {
    dbMock.on(UpdateCommand).resolves({});

    await giveBackDailyAllowance(guard, 'profile_save#user-1', 1);

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input).toMatchObject({
      Key: { key: 'profile_save#user-1#2026-10-21' },
      UpdateExpression: 'ADD #count :back',
      ConditionExpression: '#count >= :amount',
      ExpressionAttributeValues: { ':back': -1, ':amount': 1 },
    });
  });

  it('does nothing when there is no unit to give back (never below zero)', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());

    await expect(giveBackDailyAllowance(guard, 'profile_save#user-1', 1)).resolves.toBeUndefined();
  });

  it('does not hide a database failure', async () => {
    dbMock.on(UpdateCommand).rejects(new Error('table gone'));

    await expect(giveBackDailyAllowance(guard, 'profile_save#user-1', 1)).rejects.toThrow(
      'table gone'
    );
  });
});

describe('secondsUntilNextUtcDay (R-06: counters reset at midnight UTC)', () => {
  it.each([
    ['2026-10-21T12:00:00Z', 43200],
    ['2026-10-21T23:59:59Z', 1],
    ['2026-10-21T00:00:00Z', 86400],
    ['2026-12-31T18:00:00Z', 21600],
  ])('from %s it is %i seconds', (now, seconds) => {
    expect(secondsUntilNextUtcDay(new Date(now))).toBe(seconds);
  });
});
