import { describe, expect, it } from 'vite-plus/test';
import { parseUserRow } from './users';

const FULL = {
  user_id: 'user-1',
  status: 'active',
  show_google_photo: false,
  is_admin: false,
  cats_helped: 0,
  feedings: 0,
  waters: 0,
  created_at: '2026-10-01T08:00:00.000Z',
};

describe('parseUserRow checks a stored row instead of trusting it (DATA.md)', () => {
  it('accepts a row with only the always-present fields, and one with every field', () => {
    expect(parseUserRow(FULL)).toEqual(FULL);
    const everything = {
      ...FULL,
      avatar_url: 'https://lh3.googleusercontent.com/a/p',
      display_name: 'Dana Levi',
      city: 'Haifa',
      city_lat: 32.79,
      city_lng: 34.99,
      terms_accepted_at: '2026-10-01T08:00:00.000Z',
      terms_version: 1,
    };
    expect(parseUserRow(everything)).toEqual(everything);
  });

  it('names every wrong field at once, with the member id', () => {
    const broken = { ...FULL, show_google_photo: 'yes', cats_helped: undefined, status: 'gone' };

    expect(() => parseUserRow(broken)).toThrow(
      'The users row of user-1 is broken: "show_google_photo" should be a boolean, not string; ' +
        '"cats_helped" should be a number, not undefined; "status" should be active or banned'
    );
  });

  it('refuses an optional field of the wrong type', () => {
    expect(() => parseUserRow({ ...FULL, city: 5 })).toThrow(
      '"city" should be a string, not number'
    );
  });
});
