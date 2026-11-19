/** The photo answer; nothing is chosen at first, so the member says it on purpose (D-27). */
export enum PhotoChoice {
  Unanswered = '',
  Show = 'show',
  Initials = 'initials',
}

export interface ProfileFormValues {
  fullName: string;
  /** The code of the place picked from the list; null until one is picked (D-117). */
  cityId: number | null;
  photoChoice: PhotoChoice;
  termsAccepted: boolean;
}
