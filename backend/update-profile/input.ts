import { STATUS_BAD_REQUEST } from '../../shared/constants/http';
import { PROFILE_TEXT_MAX_LENGTH, PROFILE_TEXT_MIN_LENGTH } from '../../shared/constants/profile';
import { Refusal, refuse } from '../shared/api';
import type { ProfileInput } from './handler.types';

export const invalidInput = (): Refusal => new Refusal(refuse(STATUS_BAD_REQUEST, 'INVALID_INPUT'));

/** Trimmed and counted in characters, not bytes (D-61, D-92). */
function textField(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw invalidInput();
  const text = value.normalize('NFC').trim();
  const length = Array.from(text).length;
  if (length < PROFILE_TEXT_MIN_LENGTH || length > PROFILE_TEXT_MAX_LENGTH) throw invalidInput();
  return text;
}

/** Only these four fields are read; `user_id`, `status`, `is_admin` and the rest are ignored. */
export function parseInput(body: string | undefined): ProfileInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body ?? '');
  } catch {
    throw invalidInput();
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw invalidInput();
  const fields = parsed as Record<string, unknown>;
  const show = fields.show_google_photo;
  if (show !== undefined && typeof show !== 'boolean') throw invalidInput();
  return {
    displayName: textField(fields.display_name),
    city: textField(fields.city),
    showGooglePhoto: show,
    acceptTerms: fields.accept_terms === true,
  };
}
