import { fireEvent, screen } from '@testing-library/react';

import { ENGLISH_CODE, getLocaleText } from './locale-texts';
import { settleAsyncUpdates } from './settle-async-updates';

import {
  CITY_LIST_SETTLE_ROUNDS,
  HAIFA_ID,
  JERUSALEM_ID,
  NO_ARABIC_OR_RUSSIAN_ID,
  NO_RUSSIAN_ID,
  TEL_AVIV_ID,
} from '@constants/cities';

export { HAIFA_ID, JERUSALEM_ID, NO_ARABIC_OR_RUSSIAN_ID, NO_RUSSIAN_ID, TEL_AVIV_ID };

/** The city box of the sign-up form or the edit form, found by its role and its label in `code` (FIRST-15, D-117). */
export function cityBox(code = ENGLISH_CODE): HTMLInputElement {
  const found = screen.getByRole('combobox', { name: getLocaleText(code, 'firstrun.city.label') });
  if (!(found instanceof HTMLInputElement)) throw new Error('the city box is not an input');
  return found;
}

/** Types `query` in the city box and waits for the list file and its options. */
export async function typeInCityBox(query: string, code = ENGLISH_CODE): Promise<void> {
  fireEvent.change(cityBox(code), { target: { value: query } });
  await settleAsyncUpdates(CITY_LIST_SETTLE_ROUNDS);
}

/** The names of the listed options, in order. */
export const optionNames = (): string[] =>
  screen.queryAllByRole('option').map((option) => option.textContent.trim());

/** Types `query`, then taps the option that shows `optionName`: how a member picks a city (FIRST-15, D-117). */
export async function pickCity(
  query: string,
  optionName: string,
  code = ENGLISH_CODE
): Promise<void> {
  await typeInCityBox(query, code);
  fireEvent.click(screen.getByRole('option', { name: optionName }));
  await settleAsyncUpdates(1);
}
