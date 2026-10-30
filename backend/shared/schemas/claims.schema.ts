import { z } from 'zod';

/** What a handler reads of an ID token the API's JWT authorizer verified (D-59). The access token is refused. */
export const idTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  token_use: z.literal('id'),
  picture: z.string().optional(),
});
export type IdTokenClaims = z.infer<typeof idTokenClaimsSchema>;
