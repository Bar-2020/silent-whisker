import { STATUS_TOO_MANY_REQUESTS } from '../../shared/constants/http';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import { PROFILE_SAVES_PER_DAY } from '../../shared/constants/profile';
import { Refusal, rateLimited } from './api';
import { giveBackDailyAllowance, secondsUntilNextUtcDay, takeDailyAllowance } from './metered-call';
import type { CostGuard } from './metered-call.types';

/** A per-member daily limit: its counter's name (DATA.md), how many a day, and the answer past it. */
export interface MemberLimit {
  readonly name: string;
  readonly max: number;
  readonly code: string;
}

export const WRITE_BUDGET: MemberLimit = {
  name: 'write_budget',
  max: WRITES_PER_DAY,
  code: 'RATE_LIMITED',
};

export const PROFILE_SAVE: MemberLimit = {
  name: 'profile_save',
  max: PROFILE_SAVES_PER_DAY,
  code: 'PROFILE_SAVE_DAILY_LIMIT',
};

/** Who is asking and when: one reading of the clock, so a request is about one UTC day. */
export interface MemberDay {
  readonly guard: CostGuard;
  readonly userId: string;
  readonly now: Date;
}

/** True for the 429 a daily limit answers with. */
export const isDailyLimitRefusal = (error: unknown): boolean =>
  error instanceof Refusal && error.result.statusCode === STATUS_TOO_MANY_REQUESTS;

/**
 * Takes one unit of the member's limit, or refuses with 429 and the time to midnight UTC (R-21);
 * then runs the action. The unit goes back when `refund(error)` says the action never really
 * ran (D-62); any other failure keeps it spent.
 */
export async function withMemberLimit<T>(
  { guard, userId, now }: MemberDay,
  limit: MemberLimit,
  action: () => Promise<T>,
  refund: (error: unknown) => boolean
): Promise<T> {
  const counter = `${limit.name}#${userId}`;
  if (!(await takeDailyAllowance(guard, counter, 1, limit.max, now))) {
    throw new Refusal(rateLimited(limit.code, secondsUntilNextUtcDay(now)));
  }
  try {
    return await action();
  } catch (error) {
    if (refund(error)) await giveBackDailyAllowance(guard, counter, 1, now);
    throw error;
  }
}
