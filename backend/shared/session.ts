import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { Refusal, refuse, verifiedClaims } from './api';
import type { ApiEvent } from './api.types';
import type { IdTokenClaims } from './schemas/claims.schema';
import type { UserRow } from './schemas/user-row.schema';
import { readUserRow } from './users';

/** The member a request is from: the verified token, and their row (none until the first `GET /profile`). */
export interface LiveMember {
  readonly claims: IdTokenClaims;
  readonly user: UserRow | undefined;
}

/**
 * The one way a handler learns who is calling (R-22, D-109). The token must be a verified ID token
 * and the account must not be deleted: a token stays valid at the API's front door until it
 * expires, so a deleted account's token is refused here, by every route.
 */
export async function requireLiveMember(
  event: ApiEvent,
  db: DynamoDBDocumentClient,
  usersTable: string,
  consistent = false
): Promise<LiveMember> {
  const claims = verifiedClaims(event);
  if (!claims) throw new Refusal(refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED'));
  const user = await readUserRow(db, usersTable, claims.sub, consistent);
  if (user?.deleted_at !== undefined)
    throw new Refusal(refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED'));
  return { claims, user };
}
