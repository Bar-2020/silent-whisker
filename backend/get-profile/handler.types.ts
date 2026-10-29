export interface ProfileEvent {
  requestContext: { authorizer?: { jwt?: { claims?: Record<string, string | undefined> } } };
}

export interface ApiResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

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
  terms_accepted_at?: string;
  terms_version?: number;
}
