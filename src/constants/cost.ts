// Cost limits for paid checks (D-51). Money is counted in millionths of a dollar (micro-USD), so
// every cost is a whole number and adding them up never rounds.

export const MICRO_USD_PER_USD = 1_000_000;

/** The global circuit breaker: once the day's paid checks pass this, new ones wait (R-05). */
export const BREAKER_DAILY_MICRO_USD = 2 * MICRO_USD_PER_USD;

/**
 * How long a day's counter row lives before DynamoDB removes it: two days, so it always outlives
 * the UTC day it counts.
 */
export const COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60;

export const MS_PER_SECOND = 1000;
