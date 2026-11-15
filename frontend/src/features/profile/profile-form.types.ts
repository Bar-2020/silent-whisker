/** The photo answer; nothing is chosen at first, so the member says it on purpose (D-27). */
export enum PhotoChoice {
  Unanswered = '',
  Show = 'show',
  Initials = 'initials',
}

export interface ProfileFormValues {
  name: string;
  city: string;
  photo: PhotoChoice;
  terms: boolean;
}
