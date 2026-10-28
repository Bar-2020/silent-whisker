/** What the handler reads of the API Gateway event: the claims its JWT authorizer verified. */
export interface ProfileEvent {
  requestContext: { authorizer?: { jwt?: { claims?: Record<string, string | undefined> } } };
}

export interface ApiResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** One `users` row (DATA.md). A new row has only the fields below the name and city, which come with `PATCH /profile`. */
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
}
