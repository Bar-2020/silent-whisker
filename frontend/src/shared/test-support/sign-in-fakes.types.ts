export interface UserOptions {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Seconds between "now" (the test's clock) and the ID token's `exp`. */
  secondsLeft?: number;
  state?: unknown;
  /** The `picture` claim of the ID token; left out when not given. */
  picture?: string;
}

export type Listener = () => void;

export type LockRequest = (name: string, callback: () => unknown) => Promise<unknown>;
