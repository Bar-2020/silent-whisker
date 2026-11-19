import { fireEvent, screen } from '@testing-library/react';

import { fixtureCity } from '@fixtures/city-fixture';
import settings from './city-test-settings.json';
import { ENGLISH_CODE, getLocaleText } from './locale-texts';
import { settleAsyncUpdates } from './settle-async-updates';

/** Codes of places on the made-up list the tests use (`shared/__tests__/city-fixture.json`, D-117). */
export const HAIFA_ID = fixtureCity('Haifa').id;
export const TEL_AVIV_ID = fixtureCity('Tel Aviv - Yafo').id;
export const JERUSALEM_ID = fixtureCity('Jerusalem').id;
/** A place with neither an Arabic nor a Russian name on the list: Uzeir. */
export const NO_ARABIC_OR_RUSSIAN_ID = fixtureCity('Uzeir').id;
/** A place with an Arabic name and no Russian one on the list: Kiryat Ata. */
export const NO_RUSSIAN_ID = fixtureCity('Kiryat Ata').id;

/** The city file is fetched and read a macrotask or two after a screen with the box opens (D-117). */
const CITY_LIST_SETTLE_ROUNDS = settings.settleRounds;

/** The city box of the sign-up form or the edit form, found by its role and its label in `code` (FIRST-15, D-117). */
export function cityBox(code = ENGLISH_CODE): HTMLInputElement {
  const found = screen.getByRole('combobox', { name: getLocaleText(code, 'firstrun.city.label') });
  if (!(found instanceof HTMLInputElement)) throw new Error('the city box is not an input');
  return found;
}

/** Types `query` in the city box and waits for the city file and its options. */
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
