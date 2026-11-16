import {
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
import { userRowSchema } from '../shared/schemas/user-row.schema';
import { requireLiveMember } from '../shared/session';
import type { AccountDeletion } from './handler.types';

// DELETE /api/profile (D-71, D-109): `confirm: false` only answers, `confirm: true` deletes. The
// row is erased and marked deleted first, which kills the token for every route at once; then the
// Cognito sign-in is disabled, never deleted, so the same Google account can never sign in or up again.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});

const placeholder = (key: string): string => `#${key}`;

/**
 * Erases every personal field and marks the row deleted, in one update. `user_id` and `status`
 * stay, so a ban stays (D-71); an update, not a put, so it never replaces anything.
 */
async function eraseRow({ settings, userId, now }: AccountDeletion): Promise<void> {
  const personalFields = Object.keys(userRowSchema.shape).filter(
    (key) => !['user_id', 'status', 'deleted_at'].includes(key)
  );
  await db.send(
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
      ExpressionAttributeValues: { ':now': now.toISOString(), ':active': 'active' },
    })
  );
}

/** A sign-in Cognito no longer knows is already as good as disabled. */
async function disableSignIn({ settings, username }: AccountDeletion): Promise<void> {
  try {
    await cognito.send(
      new AdminDisableUserCommand({ UserPoolId: settings.USER_POOL_ID, Username: username })
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
    await eraseRow(deletion);
    await disableSignIn(deletion);
    return answer(true);
  } catch (error) {
    if (error instanceof Refusal) return error.result;
    throw error;
  }
}
