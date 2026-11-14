import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import auth from '@constants/auth.json';
import aws from '@constants/aws.json';
import { SIGN_IN_SCOPE } from '@constants/sign-in';

/** Cognito's own address; it serves no discovery document, so the two endpoints are named here. */
export const COGNITO_DOMAIN = `https://${auth.domain_prefix}.auth.${aws.selected_region}.amazoncognito.com`;

/** Tokens stay in `localStorage` so an installed app is not asked to sign in at every start (D-59). */
export const userManager = new UserManager({
  authority: COGNITO_DOMAIN,
  client_id: auth.client_id,
  redirect_uri: `${window.location.origin}${auth.callback_path}`,
  response_type: 'code',
  scope: SIGN_IN_SCOPE,
  metadata: {
    authorization_endpoint: `${COGNITO_DOMAIN}/oauth2/authorize`,
    token_endpoint: `${COGNITO_DOMAIN}/oauth2/token`,
  },
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  // Refreshing happens on demand, under one lock for all tabs (session.ts).
  automaticSilentRenew: false,
});
