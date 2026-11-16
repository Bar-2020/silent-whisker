import type { MemberDay } from '../shared/member-limits';
import type { DeleteProfileSettings } from '../shared/schemas/settings.schema';

/** Everything one delete needs: who, when, the settings, and the name Cognito knows the member by. */
export interface DeleteContext extends MemberDay {
  readonly settings: DeleteProfileSettings;
  /** The token's `cognito:username`, never anything from the request (D-109). */
  readonly username: string;
}
