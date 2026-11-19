import { CITY_FILES_PATH } from '@constants/cities';
import { STATUS_NOT_FOUND, STATUS_OK } from '@constants/http';
import { rowsFor } from './city-list';
import { LANGUAGE_CODES } from './locale-texts';
import { jsonResponse } from './sign-in-fakes';

/**
 * The site's city files for the tests (D-117): `GET /cities/<code>.json` answers the made-up list in that
 * language. A test routes the requests of its fetch mock through `answerCityFile`.
 */

export type Fault = 'missing' | 'invalid';

const requested: string[] = [];
const faults = new Map<string, Fault>();

/** Forget what was asked and what was broken; call before every test. */
export function resetCityFiles(): void {
  requested.length = 0;
  faults.clear();
}

/** The next requests for the file of `code` fail: 404, or a file that is not rows. */
export function breakCityFile(code: string, fault: Fault): void {
  faults.set(code, fault);
}

/** Whether a request is for a city file (those are not calls of the profile API). */
export const isCityFileUrl = (url: string): boolean =>
  LANGUAGE_CODES.some((one) => url.endsWith(`${CITY_FILES_PATH}/${one}.json`));

/** The languages whose city file was requested, in order, one entry per request. */
export const cityFilesRequested = (): string[] => [...requested];

/** The answer for a request of a city file, or `undefined` when the request is for something else. */
export function answerCityFile(url: string): Response | undefined {
  const code = LANGUAGE_CODES.find((one) => url.endsWith(`${CITY_FILES_PATH}/${one}.json`));
  if (code === undefined) return undefined;
  requested.push(code);
  const fault = faults.get(code);
  if (fault === 'missing') return jsonResponse(STATUS_NOT_FOUND);
  if (fault === 'invalid') return jsonResponse(STATUS_OK, [['Haifa', 1]]);
  return jsonResponse(STATUS_OK, rowsFor(code));
}
