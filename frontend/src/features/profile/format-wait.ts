import { secondsInHour, secondsInMinute } from 'date-fns/constants';
import { WaitUnit } from './format-wait.types';
import type { WaitStep } from './format-wait.types';

const SECOND: WaitStep = { unit: WaitUnit.Second, seconds: 1 };
const STEPS: readonly WaitStep[] = [
  { unit: WaitUnit.Hour, seconds: secondsInHour },
  { unit: WaitUnit.Minute, seconds: secondsInMinute },
  SECOND,
];

/** "2 hours": the daily save limit asks for a wait of up to a day (D-61), too long to count in seconds. */
export function formatWait(totalSeconds: number, language: string): string {
  const { unit, seconds } = STEPS.find((step) => totalSeconds >= step.seconds) ?? SECOND;
  return new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(
    Math.ceil(totalSeconds / seconds)
  );
}
