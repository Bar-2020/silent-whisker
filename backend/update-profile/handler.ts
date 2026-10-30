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
import { TERMS_VERSION } from '../../shared/constants/profile';
import { profileUpdateSchema } from '../../shared/schemas/profile';
import type { ProfileUpdate } from '../../shared/schemas/profile';
import { invalidInput, parseBody, Refusal, refuse, reply, verifiedClaims } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { readSettings } from '../shared/env';
import { GeocoderUnavailable, lookupPlace } from '../shared/geocode';
import {
  isDailyLimitRefusal,
  PROFILE_SAVE,
  WRITE_BUDGET,
  withMemberLimit,
} from '../shared/member-limits';
import type { MemberDay } from '../shared/member-limits';
import { updateProfileSettings } from '../shared/schemas/settings';
import type { UpdateProfileSettings } from '../shared/schemas/settings';
import type { UserRow, UserRowUpdate } from '../shared/schemas/user-row';
import { buildProfileResponse, parseUserRow, readUserRow } from '../shared/users';
import { CheckUnavailable, moderateText } from './moderate';

// PATCH /api/profile (D-62): the name and city are checked on the spot and saved only if the check
// passes. `user_id` is always the token's `sub`, and only the fields of the schema are read.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

/** Everything one save needs: who, when, the settings, the stored row and what was asked. */
interface ProfileSaveContext extends MemberDay {
  readonly settings: UpdateProfileSettings;
  readonly user: UserRow;
  readonly request: ProfileUpdate;
}

const isCheckUnavailable = (error: unknown): boolean =>
  error instanceof CheckUnavailable || error instanceof GeocoderUnavailable;

async function readActiveMember(settings: UpdateProfileSettings, userId: string): Promise<UserRow> {
  const user = await readUserRow(db, settings.USERS_TABLE, userId, true);
  if (!user) throw new Refusal(refuse(STATUS_NOT_FOUND, 'NOT_FOUND'));
  if (user.status === 'banned') throw new Refusal(refuse(STATUS_FORBIDDEN, 'BANNED'));
  return user;
}

/** The first save needs both texts and the terms (D-28, D-69); later ones may send less. */
function requireTermsAndTexts({ user, request }: ProfileSaveContext): void {
  const termsAccepted = user.terms_version === TERMS_VERSION;
  if (!termsAccepted && request.accept_terms !== true) throw invalidInput();
  if (!(request.display_name ?? user.display_name) || !(request.city ?? user.city)) {
    throw invalidInput();
  }
}

/** Unchanged city: the stored centre. Otherwise the cached lookup (D-29), or `CITY_NOT_FOUND`. */
async function resolveCityCentre(
  { settings, user }: ProfileSaveContext,
  city: string
): Promise<{ lat: number; lng: number }> {
  if (city === user.city && user.city_lat !== undefined && user.city_lng !== undefined) {
    return { lat: user.city_lat, lng: user.city_lng };
  }
  const place = await lookupPlace(
    { db, cacheTable: settings.GEOCODE_TABLE, counterTable: settings.COUNTERS_TABLE },
    city
  );
  if (!place) throw new Refusal(refuse(STATUS_UNPROCESSABLE, 'CITY_NOT_FOUND'));
  return place;
}

/**
 * Allowance first, then the city, then one check for both texts (D-62). A rejection or an unknown
 * city keeps the allowance spent; a check or lookup that could not run gives it back.
 */
async function checkNameAndCity(
  context: ProfileSaveContext,
  name: string,
  city: string
): Promise<UserRowUpdate> {
  try {
    return await withMemberLimit(
      context,
      PROFILE_SAVE,
      async () => {
        const centre = await resolveCityCentre(context, city);
        await moderateText(context.guard, context.settings, `${name}\n${city}`);
        return { display_name: name, city, city_lat: centre.lat, city_lng: centre.lng };
      },
      isCheckUnavailable
    );
  } catch (error) {
    if (!isCheckUnavailable(error)) throw error;
    throw new Refusal(refuse(STATUS_UNAVAILABLE, 'CHECK_UNAVAILABLE'));
  }
}

async function nameAndCityUpdate(context: ProfileSaveContext): Promise<UserRowUpdate> {
  const { user, request } = context;
  const name = request.display_name ?? user.display_name;
  const city = request.city ?? user.city;
  const changed = name !== user.display_name || city !== user.city;
  return name && city && changed ? checkNameAndCity(context, name, city) : {};
}

function photoAndTermsUpdate({ user, request, now }: ProfileSaveContext): UserRowUpdate {
  const update: UserRowUpdate = {};
  if (request.show_google_photo !== undefined) update.show_google_photo = request.show_google_photo;
  if (request.accept_terms && user.terms_version !== TERMS_VERSION) {
    update.terms_accepted_at = now.toISOString();
    update.terms_version = TERMS_VERSION;
  }
  return update;
}

const assignmentFor = (key: string): string => `#${key} = :${key}`;

/** Writes only if the member is still active, so a ban that lands meanwhile wins (R-08). */
async function writeRowUpdate(
  { settings, userId, user }: ProfileSaveContext,
  update: UserRowUpdate
): Promise<UserRow> {
  const entries = Object.entries(update);
  if (entries.length === 0) return user;
  try {
    const { Attributes } = await db.send(
      new UpdateCommand({
        TableName: settings.USERS_TABLE,
        Key: { user_id: userId },
        UpdateExpression: `SET ${entries.map(([key]) => assignmentFor(key)).join(', ')}`,
        ConditionExpression: 'attribute_exists(user_id) AND #status = :active',
        ExpressionAttributeNames: {
          '#status': 'status',
          ...Object.fromEntries(entries.map(([key]) => [`#${key}`, key])),
        },
        ExpressionAttributeValues: {
          ':active': 'active',
          ...Object.fromEntries(entries.map(([key, value]) => [`:${key}`, value])),
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return parseUserRow(Attributes);
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    throw new Refusal(refuse(STATUS_FORBIDDEN, 'BANNED'));
  }
}

async function saveProfile(context: ProfileSaveContext): Promise<UserRow> {
  const update = { ...(await nameAndCityUpdate(context)), ...photoAndTermsUpdate(context) };
  return writeRowUpdate(context, update);
}

export async function handler(event: ApiEvent): Promise<ApiResult> {
  const claims = verifiedClaims(event);
  if (!claims) return refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED');
  try {
    const request = parseBody(profileUpdateSchema, event.body);
    const settings = readSettings(updateProfileSettings);
    const context: ProfileSaveContext = {
      settings,
      request,
      user: await readActiveMember(settings, claims.sub),
      userId: claims.sub,
      now: new Date(),
      guard: {
        db,
        sns,
        tableName: settings.COUNTERS_TABLE,
        alertTopicArn: settings.ALERT_TOPIC_ARN,
      },
    };
    requireTermsAndTexts(context);
    const saved = await withMemberLimit(
      context,
      WRITE_BUDGET,
      () => saveProfile(context),
      isDailyLimitRefusal
    );
    return reply(STATUS_OK, buildProfileResponse(saved));
  } catch (error) {
    if (error instanceof Refusal) return error.result;
    throw error;
  }
}
