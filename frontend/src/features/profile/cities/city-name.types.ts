/** A place as the screens use it, from one row of the city file of the app's language (D-117). */
export interface CityName {
  readonly id: number;
  readonly name: string;
  readonly english: string;
  /**
   * A bigger, better-known place (the government list has no population, so: one it gives a Russian
   * name). Typing "tel" lists Tel Aviv - Yafo before the small villages that also start with "tel".
   */
  readonly isWellKnown: boolean;
}
