import auth from './auth.json';

/** The addresses of the app's pages; the one place they are written (the API's paths are in `http.ts`). */
export const HOME_PATH = '/';
export const PRIVACY_PATH = '/privacy';
export const TERMS_PATH = '/terms';
export const AUTH_CALLBACK_PATH = auth.callback_path;
export const PROFILE_PATH = '/profile';
export const INSTALL_GUIDE_PATH = `${PROFILE_PATH}/install`;
