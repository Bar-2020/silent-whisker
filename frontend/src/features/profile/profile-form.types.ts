import type { ParseKeys } from 'i18next';

export enum PhotoChoice {
  Unanswered = 'unanswered',
  Show = 'show',
  Initials = 'initials',
}

/** The sign-up form asks for the terms too; the edit form on the profile page does not. */
export enum FormMode {
  SignUp = 'signUp',
  Edit = 'edit',
}

export enum Field {
  Name = 'name',
  City = 'city',
  Photo = 'photo',
  Terms = 'terms',
}

export interface ProfileFormValues {
  readonly name: string;
  readonly city: string;
  readonly photo: PhotoChoice;
  readonly terms: boolean;
}

export interface ProfileFormSetup {
  readonly mode: FormMode;
  /** Whether Google sent a photo, so the question is worth asking (D-108). */
  readonly askPhoto: boolean;
}

/** A message under a field or above the button: a locale key and what its text needs. */
export interface Issue {
  readonly key: ParseKeys;
  readonly values?: Readonly<Record<string, string | number>>;
}

export type FieldIssues = Partial<Record<Field, Issue>>;
