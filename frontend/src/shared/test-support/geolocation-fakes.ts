import { type Mock, vi } from 'vite-plus/test';
import { GEOLOCATION_ERROR_CODES } from '@constants/location';

/** What the Permissions API answers for `geolocation`; `null` stands for a browser that has no Permissions API. */
export type PermissionAnswer = 'granted' | 'denied' | 'prompt';

export interface BrowserLocationOptions {
  /** The answer of `navigator.permissions.query`; `null`: there is no `navigator.permissions`. */
  permission: PermissionAnswer | null;
  /** `false`: there is no `navigator.geolocation` at all. */
  geolocation: boolean;
}

export interface BrowserLocation {
  /** Every `navigator.permissions.query` call, with its argument. */
  query: Mock<(descriptor: PermissionDescriptor) => Promise<{ state: string }>>;
  /** Every `navigator.geolocation.getCurrentPosition` call. */
  getCurrentPosition: Mock<Geolocation['getCurrentPosition']>;
  /** The prompts the browser has open: asked and not answered yet. */
  openPrompts: () => number;
  /** The member allows: the permission becomes `granted` and the oldest open prompt gets a position. */
  answerWithPosition: () => void;
  /** The member refuses: the permission becomes `denied` and the oldest open prompt gets an error. */
  answerWithRefusal: () => void;
  /** What the browser says from now on (the answer of a later `query`). */
  setPermission: (permission: PermissionAnswer) => void;
}

const POSITION: GeolocationPosition = {
  coords: {
    accuracy: 1,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: 0,
    longitude: 0,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 0,
  toJSON: () => ({}),
};

const REFUSAL: GeolocationPositionError = {
  code: GEOLOCATION_ERROR_CODES.PERMISSION_DENIED,
  message: '',
  ...GEOLOCATION_ERROR_CODES,
};

type NavigatorMember = 'permissions' | 'geolocation';

const defined: NavigatorMember[] = [];

function define(name: NavigatorMember, value: unknown): void {
  Object.defineProperty(navigator, name, { configurable: true, value });
  defined.push(name);
}

/** jsdom has neither member: they are defined for the test and deleted by `restoreBrowserLocation`. */
export function installBrowserLocation(options: BrowserLocationOptions): BrowserLocation {
  restoreBrowserLocation();
  let permission: PermissionAnswer = options.permission ?? 'prompt';
  const open: { success: PositionCallback; error: PositionErrorCallback | null | undefined }[] = [];

  const query = vi.fn<(descriptor: PermissionDescriptor) => Promise<{ state: string }>>(() =>
    Promise.resolve({ state: permission })
  );
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success, error) => {
    open.push({ success, error });
  });

  if (options.permission !== null) define('permissions', { query });
  if (options.geolocation) define('geolocation', { getCurrentPosition });

  return {
    query,
    getCurrentPosition,
    openPrompts: () => open.length,
    setPermission: (next) => {
      permission = next;
    },
    answerWithPosition: () => {
      permission = 'granted';
      open.shift()?.success(POSITION);
    },
    answerWithRefusal: () => {
      permission = 'denied';
      open.shift()?.error?.(REFUSAL);
    },
  };
}

export function restoreBrowserLocation(): void {
  for (const name of defined.splice(0)) Reflect.deleteProperty(navigator, name);
}
