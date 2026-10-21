import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BREAKER_DAILY_MICRO_USD, COUNTER_TTL_SECONDS } from '../../src/constants/cost';
import { type CostGuard, meteredCall, takeDailyAllowance } from './metered-call';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-north-1' }));
const sns = new SNSClient({ region: 'eu-north-1' });
const dbMock = mockClient(db);
const snsMock = mockClient(sns);

const NOW = new Date('2026-10-21T12:00:00Z');
const guard: CostGuard = {
  db,
  sns,
  tableName: 'daily_counters',
  alertTopicArn: 'arn:aws:sns:eu-north-1:123456789012:silent-whisker-cost-alerts',
  now: () => NOW,
};

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

beforeEach(() => {
  dbMock.reset();
  snsMock.reset();
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
      TableName: 'daily_counters',
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

  it('does not email again once today has been alerted', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).rejects(conditionFailed());

    const result = await meteredCall(guard, 1500, vi.fn());

    expect(result).toEqual({ outcome: 'deferred' });
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });

  it('still defers when the email itself fails', async () => {
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).resolves({});
    snsMock.on(PublishCommand).rejects(new Error('SNS is down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(meteredCall(guard, 1500, vi.fn())).resolves.toEqual({ outcome: 'deferred' });
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

  it('keys the counter by the UTC day (R-06), not the local one', async () => {
    dbMock.on(UpdateCommand).resolves({});
    const lateEvening = { ...guard, now: () => new Date('2026-10-21T23:30:00-03:00') };

    await takeDailyAllowance(lateEvening, 'breaker', 1, 2);

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
