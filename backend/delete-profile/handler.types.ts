import type { DeleteProfileSettings } from '../shared/schemas/settings.schema';

/** One account deletion: who, the settings, and the name Cognito knows the member by. */
export interface AccountDeletion {
  readonly userId: string;
  /** The token's `cognito:username`, never anything from the request (D-109). */
  readonly username: string;
  readonly settings: DeleteProfileSettings;
  readonly now: Date;
}
