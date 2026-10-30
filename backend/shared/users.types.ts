/** A new row has no name or city: they come with `PATCH /profile`. */
export interface UserRow {
  user_id: string;
  status: 'active' | 'banned';
  show_google_photo: boolean;
  is_admin: boolean;
  cats_helped: number;
  feedings: number;
  waters: number;
  created_at: string;
  avatar_url?: string;
  display_name?: string;
  city?: string;
  city_lat?: number;
  city_lng?: number;
  terms_accepted_at?: string;
  terms_version?: number;
}

/** The answer body of `GET /profile` and `PATCH /profile` (API.md). */
export interface Profile {
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  show_google_photo: boolean;
  status: UserRow['status'];
  terms_accepted: boolean;
}
