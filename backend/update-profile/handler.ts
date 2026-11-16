import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_UNAVAILABLE,
} from '../../shared/constants/http';
import { TERMS_VERSION } from '../../shared/constants/profile';
import { profileUpdateSchema } from '../../shared/schemas/profile.schema';
import type { ProfileUpdate } from '../../shared/schemas/profile.schema';
import { findCity } from '../shared/cities';
import { invalidInput, parseBody, Refusal, refuse, reply } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { readSettings } from '../shared/env';
import {
  isDailyLimitRefusal,
  PROFILE_SAVE,
  WRITE_BUDGET,
  withMemberLimit,
} from '../shared/member-limits';
import type { MemberDay } from '../shared/member-limits';
import type { CostGuard } from '../shared/metered-call.types';
import { updateProfileSettings } from '../shared/schemas/settings.schema';
import type { UpdateProfileSettings } from '../shared/schemas/settings.schema';
import type { UserRow, UserRowUpdate } from '../shared/schemas/user-row.schema';
import { requireLiveMember } from '../shared/session';
import { buildProfileResponse, parseUserRow } from '../shared/users';
import { CheckUnavailable, moderateText } from './moderate';
import { MEMBER_STATUS } from '../../shared/constants/member-status';

// PATCH /api/profile (D-62, D-117): the name is checked on the spot and saved only if the check
// passes; the city is a code from the list. `user_id` is always the token's `sub`, and only the fields of the schema are read.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

/** Everything one save needs: who, when, the settings, the stored row and what was asked. */
interface ProfileSaveContext extends MemberDay {
  readonly guard: CostGuard;
  readonly settings: UpdateProfileSettings;
  readonly user: UserRow;
  readonly request: ProfileUpdate;
}

const isCheckUnavailable = (error: unknown): boolean => error instanceof CheckUnavailable;

/** A member with a row who is not banned: the live member of the token, or a refusal. */
async function readActiveMember(event: ApiEvent, settings: UpdateProfileSettings) {
  const { claims, user } = await requireLiveMember(event, db, settings.USERS_TABLE, true);
  if (!user) throw new Refusal(refuse(STATUS_NOT_FOUND, 'NOT_FOUND'));
  if (user.status === MEMBER_STATUS.banned) throw new Refusal(refuse(STATUS_FORBIDDEN, 'BANNED'));
  return { claims, user };
}

/** The first save needs the name, the city and the terms (D-28, D-69); later ones may send less. */
function requireTermsAndTexts({ user, request }: ProfileSaveContext): void {
  const termsAccepted = user.terms_version === TERMS_VERSION;
  if (!termsAccepted && request.accept_terms !== true) throw invalidInput();
  if (!(request.display_name ?? user.display_name) || !(request.city_id ?? user.city_id)) {
    throw invalidInput();
  }
}

/** A picked city must be on the list (D-117), refused before anything is spent. */
function requireListedCity({ request }: ProfileSaveContext): void {
  if (request.city_id !== undefined && !findCity(request.city_id)) throw invalidInput();
}

/** Only the city's code is stored; its position stays in the list. */
const cityUpdate = ({ user, request }: ProfileSaveContext): UserRowUpdate =>
  request.city_id === undefined || request.city_id === user.city_id
    ? {}
    : { city_id: request.city_id };

/**
 * Allowance first, then the one check of the name (D-62). A rejection keeps the allowance spent; a
 * check that could not run gives it back.
 */
async function checkName(context: ProfileSaveContext, name: string): Promise<UserRowUpdate> {
  try {
    return await withMemberLimit(
      context,
      PROFILE_SAVE,
      async () => {
        await moderateText(context.guard, context.settings, name);
        return { display_name: name };
      },
      isCheckUnavailable
    );
  } catch (error) {
    if (!isCheckUnavailable(error)) throw error;
    throw new Refusal(refuse(STATUS_UNAVAILABLE, 'CHECK_UNAVAILABLE'));
  }
}

async function nameUpdate(context: ProfileSaveContext): Promise<UserRowUpdate> {
  const { user, request } = context;
  const name = request.display_name ?? user.display_name;
  return name && name !== user.display_name ? checkName(context, name) : {};
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
        ConditionExpression:
          'attribute_exists(user_id) AND attribute_not_exists(deleted_at) AND #status = :active',
        ExpressionAttributeNames: {
          '#status': 'status',
          ...Object.fromEntries(entries.map(([key]) => [`#${key}`, key])),
        },
        ExpressionAttributeValues: {
          ':active': MEMBER_STATUS.active,
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
  const update = {
    ...cityUpdate(context),
    ...(await nameUpdate(context)),
    ...photoAndTermsUpdate(context),
  };
  return writeRowUpdate(context, update);
}

export async function handler(event: ApiEvent): Promise<ApiResult> {
  try {
    const settings = readSettings(updateProfileSettings);
    const { claims, user } = await readActiveMember(event, settings);
    const request = parseBody(profileUpdateSchema, event.body);
    const context: ProfileSaveContext = {
      settings,
      request,
      user,
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
    requireListedCity(context);
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
