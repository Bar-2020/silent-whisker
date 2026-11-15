import { z } from 'zod';
import auth from '@constants/auth.json';
import { AFTER_SIGN_IN_PATH } from '@constants/sign-in';

/** A path of this app, never another site (`//` and `/\` would be) and never the callback itself. */
export const returnToSchema = z
  .string()
  .refine(
    (path) =>
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !path.startsWith('/\\') &&
      !path.startsWith(auth.callback_path)
  )
  .catch(AFTER_SIGN_IN_PATH);
