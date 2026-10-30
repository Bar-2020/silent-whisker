import { STATUS_BAD_REQUEST } from '../../shared/constants/http';
import { PROFILE_TEXT_MAX_LENGTH, PROFILE_TEXT_MIN_LENGTH } from '../../shared/constants/profile';
import { Refusal, refuse } from '../shared/api';
import type { ProfileInput } from './handler.types';

export const invalidInput = (): Refusal => new Refusal(refuse(STATUS_BAD_REQUEST, 'INVALID_INPUT'));

/** Control characters (a newline too) and the ones that reverse text direction (U+202A to U+202E, U+2066 to U+2069). */
const FORBIDDEN = /[\p{Cc}‪-‮⁦-⁩]/u;

/** At least one character a reader can see: not a space, and not a control or invisible format character. */
const VISIBLE = /[^\s\p{C}]/u;

/** Trimmed and counted in characters, not bytes (D-61, D-92). */
function textField(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw invalidInput();
  const text = value.normalize('NFC').trim();
  const length = Array.from(text).length;
  if (length < PROFILE_TEXT_MIN_LENGTH || length > PROFILE_TEXT_MAX_LENGTH) throw invalidInput();
  if (FORBIDDEN.test(text) || !VISIBLE.test(text)) throw invalidInput();
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
