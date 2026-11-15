export enum WaitUnit {
  Hour = 'hour',
  Minute = 'minute',
  Second = 'second',
}

/** One way to write a wait: from `seconds` up, counted in `unit`s. */
export interface WaitStep {
  readonly unit: WaitUnit;
  readonly seconds: number;
}
