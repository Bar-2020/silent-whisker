import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_UNAUTHORIZED,
  STATUS_UNAVAILABLE,
  STATUS_UNPROCESSABLE,
} from '../../shared/constants/http';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import { PROFILE_SAVES_PER_DAY, TERMS_VERSION } from '../../shared/constants/profile';
import { rateLimited, Refusal, refuse, reply, verifiedClaims } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { requiredEnv } from '../shared/env';
import { GeocoderUnavailable, lookupPlace } from '../shared/geocode';
import {
  giveBackDailyAllowance,
  secondsUntilNextUtcDay,
  takeDailyAllowance,
} from '../shared/metered-call';
import type { CostGuard } from '../shared/metered-call.types';
import { profileOf, readUser } from '../shared/users';
import type { UserRow } from '../shared/users.types';
import type { Changes, ProfileInput } from './handler.types';
import { invalidInput, parseInput } from './input';
import { CheckUnavailable, moderateText } from './moderate';

// PATCH /api/profile (D-62): the name and city are checked on the spot and saved only if the check
// passes. `user_id` is always the token's `sub`, and only four body fields are read (input.ts).

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

interface Save {
  readonly userId: string;
  readonly user: UserRow;
  readonly input: ProfileInput;
  readonly guard: CostGuard;
  readonly now: Date;
}

async function memberRow(userId: string): Promise<UserRow> {
  const user = await readUser(db, requiredEnv('USERS_TABLE'), userId, true);
  if (!user) throw new Refusal(refuse(STATUS_NOT_FOUND, 'NOT_FOUND'));
  if (user.status === 'banned') throw new Refusal(refuse(STATUS_FORBIDDEN, 'BANNED'));
  return user;
}

/** The first save needs both texts and the terms (D-28, D-69); later ones may send less. */
function requireInputs({ user, input }: Save): void {
  const termsAccepted = user.terms_version === TERMS_VERSION;
  if (!termsAccepted && !input.acceptTerms) throw invalidInput();
  if (!(input.displayName ?? user.display_name) || !(input.city ?? user.city)) {
    throw invalidInput();
  }
}

/** One more unit of a per-member daily limit, or the 429 that says when to come back (R-21). */
async function spend(save: Save, name: string, max: number, code: string): Promise<void> {
  const taken = await takeDailyAllowance(save.guard, `${name}#${save.userId}`, 1, max, save.now);
  if (!taken) throw new Refusal(rateLimited(code, secondsUntilNextUtcDay(save.now)));
}

/** Unchanged city: the stored centre. Otherwise the cached lookup (D-29), or `CITY_NOT_FOUND`. */
async function cityPoint(city: string, user: UserRow): Promise<{ lat: number; lng: number }> {
  if (city === user.city && user.city_lat !== undefined && user.city_lng !== undefined) {
    return { lat: user.city_lat, lng: user.city_lng };
  }
  const place = await lookupPlace(
    {
      db,
      cacheTable: requiredEnv('GEOCODE_TABLE'),
      counterTable: requiredEnv('COUNTERS_TABLE'),
    },
    city
  );
  if (!place) throw new Refusal(refuse(STATUS_UNPROCESSABLE, 'CITY_NOT_FOUND'));
  return place;
}

/**
 * Allowance first, then the city, then one check for both texts (D-62). A rejection or an unknown
 * city keeps the allowance spent; a check or lookup that could not run gives it back.
 */
async function vetText(save: Save, name: string, city: string): Promise<Changes> {
  await spend(save, 'profile_save', PROFILE_SAVES_PER_DAY, 'PROFILE_SAVE_DAILY_LIMIT');
  try {
    const point = await cityPoint(city, save.user);
    await moderateText(save.guard, `${name}\n${city}`);
    return { display_name: name, city, city_lat: point.lat, city_lng: point.lng };
  } catch (error) {
    if (!(error instanceof CheckUnavailable || error instanceof GeocoderUnavailable)) throw error;
    await giveBackDailyAllowance(save.guard, `profile_save#${save.userId}`, 1, save.now);
    throw new Refusal(refuse(STATUS_UNAVAILABLE, 'CHECK_UNAVAILABLE'));
  }
}

async function textChanges(save: Save): Promise<Changes> {
  const { user, input } = save;
  const name = input.displayName ?? user.display_name;
  const city = input.city ?? user.city;
  const changed = name !== user.display_name || city !== user.city;
  return name && city && changed ? vetText(save, name, city) : {};
}

function settingChanges({ user, input, now }: Save): Changes {
  const changes: Changes = {};
  if (input.showGooglePhoto !== undefined) changes.show_google_photo = input.showGooglePhoto;
  if (input.acceptTerms && user.terms_version !== TERMS_VERSION) {
    changes.terms_accepted_at = now.toISOString();
    changes.terms_version = TERMS_VERSION;
  }
  return changes;
}

const changesFor = async (save: Save): Promise<Changes> => ({
  ...(await textChanges(save)),
  ...settingChanges(save),
});

const setClause = (key: string): string => `#${key} = :${key}`;

/** Writes only if the member is still active, so a ban that lands meanwhile wins (R-08). */
async function store(userId: string, user: UserRow, changes: Changes): Promise<UserRow> {
  const keys = Object.keys(changes);
  if (keys.length === 0) return user;
  try {
    const { Attributes } = await db.send(
      new UpdateCommand({
        TableName: requiredEnv('USERS_TABLE'),
        Key: { user_id: userId },
        UpdateExpression: `SET ${keys.map(setClause).join(', ')}`,
        ConditionExpression: 'attribute_exists(user_id) AND #status = :active',
        ExpressionAttributeNames: {
          '#status': 'status',
          ...Object.fromEntries(keys.map((key) => [`#${key}`, key])),
        },
        ExpressionAttributeValues: {
          ':active': 'active',
          ...Object.fromEntries(keys.map((key) => [`:${key}`, changes[key]])),
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return Attributes as UserRow;
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    throw new Refusal(refuse(STATUS_FORBIDDEN, 'BANNED'));
  }
}

export async function handler(event: ApiEvent): Promise<ApiResult> {
  const claims = verifiedClaims(event);
  if (!claims) return refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED');
  try {
    const input = parseInput(event.body);
    const user = await memberRow(claims.sub);
    const save: Save = {
      userId: claims.sub,
      user,
      input,
      now: new Date(),
      guard: {
        db,
        sns,
        tableName: requiredEnv('COUNTERS_TABLE'),
        alertTopicArn: requiredEnv('ALERT_TOPIC_ARN'),
      },
    };
    requireInputs(save);
    await spend(save, 'write_budget', WRITES_PER_DAY, 'RATE_LIMITED');
    const changes = await changesFor(save);
    return reply(STATUS_OK, profileOf(await store(claims.sub, user, changes)));
  } catch (error) {
    if (error instanceof Refusal) return error.result;
    throw error;
  }
}
