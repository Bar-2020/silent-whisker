/** Sign-in did not finish, or the account could not be loaded, or the server asked to wait (D-60). */
export type AuthFailedProps =
  | { kind: 'signIn' | 'connection'; onRetry: () => void }
  | { kind: 'rateLimited'; waitSeconds: number; onRetry: () => void };
