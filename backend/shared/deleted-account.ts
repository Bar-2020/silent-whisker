import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DELETED_ACCOUNT_KEY_PREFIX, ID_TOKEN_LIFE_SECONDS } from '../../shared/constants/account';
import { MS_PER_SECOND } from '../../shared/constants/cost';

// The marker of D-109: a deleted member's ID token still passes the API's authorizer until it
// expires, so `GET /profile` asks this marker before it would make an empty row for it.

const keyOf = (userId: string): { key: string } => ({
  key: `${DELETED_ACCOUNT_KEY_PREFIX}${userId}`,
});

/** Written last, once the account is really gone; DynamoDB removes it after the token's whole life. */
export async function markAccountDeleted(
  db: DynamoDBDocumentClient,
  table: string,
  userId: string,
  now: Date
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: table,
      Key: keyOf(userId),
      UpdateExpression: 'SET expires_at = :expires',
      ExpressionAttributeValues: {
        ':expires': Math.floor(now.getTime() / MS_PER_SECOND) + ID_TOKEN_LIFE_SECONDS,
      },
    })
  );
}

/** An eventually consistent read: a stale answer only lets a token live a moment longer. */
export async function checkAccountDeleted(
  db: DynamoDBDocumentClient,
  table: string,
  userId: string
): Promise<boolean> {
  const { Item } = await db.send(new GetCommand({ TableName: table, Key: keyOf(userId) }));
  return Item !== undefined;
}
