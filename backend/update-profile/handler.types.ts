/** What `PATCH /profile` reads of the body; everything is optional except the terms flag. */
export interface ProfileInput {
  readonly displayName: string | undefined;
  readonly city: string | undefined;
  readonly showGooglePhoto: boolean | undefined;
  readonly acceptTerms: boolean;
}

/** What one successful save writes onto the member's row. */
export type Changes = Record<string, string | number | boolean>;
