import {
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { STATUS_OK, STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { profileDeleteSchema } from '../../shared/schemas/profile.schema';
import { parseBody, Refusal, refuse, reply, verifiedClaims } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { markAccountDeleted } from '../shared/deleted-account';
import { readSettings } from '../shared/env';
import { WRITE_BUDGET, withMemberLimit } from '../shared/member-limits';
import { deleteProfileSettings } from '../shared/schemas/settings.schema';
import { userRowSchema } from '../shared/schemas/user-row.schema';
import { readUserRow } from '../shared/users';
import type { DeleteContext } from './handler.types';

// DELETE /api/profile (D-71, D-109): `confirm: false` only answers, `confirm: true` deletes. The
// steps run row, then Cognito, then the token marker, and each can be repeated after a failure.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});

/** A member Cognito no longer knows is already done, so a retry after a half delete works. */
async function ignoreUnknownUser(step: Promise<unknown>): Promise<void> {
  try {
    await step;
  } catch (error) {
    if (!(error instanceof UserNotFoundException)) throw error;
  }
}

/** The row goes unless the member is banned: false then, also when the ban landed after the read. */
async function deleteActiveRow({ settings, userId }: DeleteContext): Promise<boolean> {
  try {
    await db.send(
      new DeleteCommand({
        TableName: settings.USERS_TABLE,
        Key: { user_id: userId },
        ConditionExpression: 'attribute_not_exists(user_id) OR #status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'active' },
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}

/** The ban stays (D-71): everything but `user_id` and `status` goes, by an update that cannot make a row. */
const placeholder = (key: string): string => `#${key}`;

async function reduceToBanStub({ settings, userId }: DeleteContext): Promise<void> {
  const removed = Object.keys(userRowSchema.shape).filter(
    (key) => key !== 'user_id' && key !== 'status'
  );
  await db.send(
    new UpdateCommand({
      TableName: settings.USERS_TABLE,
      Key: { user_id: userId },
      UpdateExpression: `REMOVE ${removed.map(placeholder).join(', ')}`,
      ConditionExpression: '#status = :banned',
      ExpressionAttributeNames: {
        '#status': 'status',
        ...Object.fromEntries(removed.map((key) => [placeholder(key), key])),
      },
      ExpressionAttributeValues: { ':banned': 'banned' },
    })
  );
}

async function deleteAccount(context: DeleteContext): Promise<void> {
  const { settings, userId, username, now } = context;
  const user = await readUserRow(db, settings.USERS_TABLE, userId, true);
  const keepsBan = user?.status === 'banned' || !(await deleteActiveRow(context));
  const userPool = { UserPoolId: settings.USER_POOL_ID, Username: username };
  if (keepsBan) {
    await reduceToBanStub(context);
    await ignoreUnknownUser(cognito.send(new AdminDisableUserCommand(userPool)));
  } else {
    await ignoreUnknownUser(cognito.send(new AdminDeleteUserCommand(userPool)));
  }
  await markAccountDeleted(db, settings.COUNTERS_TABLE, userId, now);
}

const answer = (deleted: boolean): ApiResult => reply(STATUS_OK, { deleted });

/** Who is deleting, from the verified token alone: the sub, and the name Cognito knows them by. */
function requireMember(event: ApiEvent): { userId: string; username: string } {
  const claims = verifiedClaims(event);
  const username = claims?.['cognito:username'];
  if (!claims || !username) throw new Refusal(refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED'));
  return { userId: claims.sub, username };
}

export async function handler(event: ApiEvent): Promise<ApiResult> {
  try {
    const member = requireMember(event);
    const { confirm } = parseBody(profileDeleteSchema, event.body);
    const settings = readSettings(deleteProfileSettings);
    if (!confirm) return answer(false);
    const context: DeleteContext = {
      ...member,
      settings,
      now: new Date(),
      guard: { db, tableName: settings.COUNTERS_TABLE },
    };
    // A failed delete keeps its unit spent: a retry is a new write, and a member has plenty a day.
    await withMemberLimit(
      context,
      WRITE_BUDGET,
      () => deleteAccount(context),
      () => false
    );
    return answer(true);
  } catch (error) {
    if (error instanceof Refusal) return error.result;
    throw error;
  }
}
