import {
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { STATUS_OK, STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { profileDeleteSchema } from '../../shared/schemas/profile.schema';
import { parseBody, Refusal, refuse, reply } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { readSettings } from '../shared/env';
import { deleteProfileSettings } from '../shared/schemas/settings.schema';
import { RETIRED_PERSONAL_FIELDS, userRowSchema } from '../shared/schemas/user-row.schema';
import type { UserRow } from '../shared/schemas/user-row.schema';
import { requireLiveMember } from '../shared/session';
import type { AccountDeletion } from './handler.types';
import { MEMBER_STATUS } from '../../shared/constants/member-status';

// DELETE /api/profile (D-71, D-109, D-112): `confirm: false` only answers, `confirm: true` deletes. The
// row is erased and marked deleted first, which kills the token for every route at once; then the
// Cognito sign-in goes: deleted for an active member (who can sign up again as a new one), only
// disabled for a banned one (so a ban cannot be dodged by deleting).

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});

const placeholder = (key: string): string => `#${key}`;

/**
 * Erases every personal field and marks the row deleted, in one update. `user_id` and `status`
 * stay, so a ban stays (D-71); an update, not a put, so it never replaces anything.
 */
async function eraseRow({ settings, userId, now }: AccountDeletion): Promise<UserRow['status']> {
  const personalFields = [
    ...Object.keys(userRowSchema.shape).filter(
      (key) => !['user_id', 'status', 'deleted_at'].includes(key)
    ),
    ...RETIRED_PERSONAL_FIELDS,
  ];
  const { Attributes } = await db.send(
    new UpdateCommand({
      TableName: settings.USERS_TABLE,
      Key: { user_id: userId },
      // A caller with no row yet gets one holding only these two: it is still marked deleted.
      UpdateExpression: `SET #deleted_at = :now, #status = if_not_exists(#status, :active) REMOVE ${personalFields.map(placeholder).join(', ')}`,
      ExpressionAttributeNames: {
        '#deleted_at': 'deleted_at',
        '#status': 'status',
        ...Object.fromEntries(personalFields.map((key) => [placeholder(key), key])),
      },
      ExpressionAttributeValues: { ':now': now.toISOString(), ':active': MEMBER_STATUS.active },
      ReturnValues: 'ALL_NEW',
    })
  );
  // The status the update left, not the one read first: a ban that landed in between still counts (D-112).
  return userRowSchema.shape.status.parse(Attributes?.status);
}

/** A sign-in Cognito no longer knows is already as good as gone. */
async function endSignIn(
  { settings, username }: AccountDeletion,
  status: UserRow['status']
): Promise<void> {
  const user = { UserPoolId: settings.USER_POOL_ID, Username: username };
  try {
    await cognito.send(
      status === MEMBER_STATUS.banned
        ? new AdminDisableUserCommand(user)
        : new AdminDeleteUserCommand(user)
    );
  } catch (error) {
    if (!(error instanceof UserNotFoundException)) throw error;
  }
}

const answer = (deleted: boolean): ApiResult => reply(STATUS_OK, { deleted });

export async function handler(event: ApiEvent): Promise<ApiResult> {
  try {
    const settings = readSettings(deleteProfileSettings);
    const { claims } = await requireLiveMember(event, db, settings.USERS_TABLE, true);
    const username = claims['cognito:username'];
    if (!username) return refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED');
    const { confirm } = parseBody(profileDeleteSchema, event.body);
    if (!confirm) return answer(false);
    // Not counted in the daily write budget: it must work with no units left, and the token dies with it (D-109).
    const deletion: AccountDeletion = { userId: claims.sub, username, settings, now: new Date() };
    await endSignIn(deletion, await eraseRow(deletion));
    return answer(true);
  } catch (error) {
    if (error instanceof Refusal) return error.result;
    throw error;
  }
}
