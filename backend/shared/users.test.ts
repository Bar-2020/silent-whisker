import { describe, expect, it } from 'vite-plus/test';
import { HAIFA_ID } from '../../shared/constants/cities';
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
      city_id: HAIFA_ID,
      terms_accepted_at: '2026-10-01T08:00:00.000Z',
      terms_version: 1,
    };
    expect(parseUserRow(everything)).toEqual(everything);
  });

  it('names every wrong field at once, with the member id', () => {
    const broken = { ...FULL, show_google_photo: 'yes', cats_helped: 'many', status: 'gone' };

    expect(() => parseUserRow(broken)).toThrow(/user-1.*status.*show_google_photo.*cats_helped/s);
  });

  it('reads the stub a deleted banned member leaves, with the missing fields at zero (D-71, D-109)', () => {
    expect(parseUserRow({ user_id: 'user-1', status: 'banned' })).toEqual({
      user_id: 'user-1',
      status: 'banned',
      show_google_photo: false,
      is_admin: false,
      cats_helped: 0,
      feedings: 0,
      waters: 0,
    });
  });

  it.each(['active', 'banned'])(
    'reads the row a delete leaves for an %s member, keeping deleted_at and giving the rest their zero values (D-109)',
    (status) => {
      const deleted = { user_id: 'user-1', status, deleted_at: '2026-11-16T09:00:00.000Z' };

      expect(parseUserRow(deleted)).toEqual({
        ...deleted,
        show_google_photo: false,
        is_admin: false,
        cats_helped: 0,
        feedings: 0,
        waters: 0,
      });
    }
  );

  it('still refuses a row with no status or no user id', () => {
    expect(() => parseUserRow({ ...FULL, status: undefined })).toThrow(/status/);
    expect(() => parseUserRow({ ...FULL, user_id: undefined })).toThrow(/user_id/);
  });

  it('refuses an optional field of the wrong type', () => {
    // D-117: the row keeps the city's code, a number
    expect(() => parseUserRow({ ...FULL, city_id: 'Haifa' })).toThrow(/city_id/);
  });
});
