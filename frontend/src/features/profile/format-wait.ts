import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '@constants/time';

const SECOND = { unit: 'second', seconds: 1 } as const;
const UNITS = [
  { unit: 'hour', seconds: SECONDS_PER_HOUR },
  { unit: 'minute', seconds: SECONDS_PER_MINUTE },
  SECOND,
] as const;

/** "2 hours": the daily save limit asks for a wait of up to a day (D-61), too long to count in seconds. */
export function formatWait(totalSeconds: number, language: string): string {
  const { unit, seconds } = UNITS.find((entry) => totalSeconds >= entry.seconds) ?? SECOND;
  return new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(
    Math.ceil(totalSeconds / seconds)
  );
}
