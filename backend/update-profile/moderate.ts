import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { TEXT_CHECK_COST_MICRO_USD } from '../../shared/constants/cost';
import { STATUS_UNPROCESSABLE } from '../../shared/constants/http';
import { TEXT_CHECK_TIMEOUT_MS } from '../../shared/constants/profile';
import { Refusal, refuse } from '../shared/api';
import { requiredEnv } from '../shared/env';
import { meteredCall } from '../shared/metered-call';
import type { CostGuard } from '../shared/metered-call.types';

/** The check could not run: the breaker has tripped (R-05) or the call failed (R-04). */
export class CheckUnavailable extends Error {}

const bedrock = new BedrockRuntimeClient({});

/** One call of the text moderation guardrail; its answer is `NONE` or `GUARDRAIL_INTERVENED`. */
const applyGuardrail = async (text: string): Promise<string | undefined> => {
  const answer = await bedrock.send(
    new ApplyGuardrailCommand({
      guardrailIdentifier: requiredEnv('GUARDRAIL_ID'),
      guardrailVersion: requiredEnv('GUARDRAIL_VERSION'),
      source: 'INPUT',
      content: [{ text: { text } }],
    }),
    { abortSignal: AbortSignal.timeout(TEXT_CHECK_TIMEOUT_MS) }
  );
  return answer.action;
};

/** Passes when the guardrail lets the text through; every other outcome stops the save. */
export async function moderateText(guard: CostGuard, text: string): Promise<void> {
  let action: string | undefined;
  try {
    const outcome = await meteredCall(guard, TEXT_CHECK_COST_MICRO_USD, () => applyGuardrail(text));
    if (outcome.outcome === 'deferred') throw new CheckUnavailable();
    action = outcome.value;
  } catch (error) {
    if (!(error instanceof CheckUnavailable)) console.error('text moderation failed', error);
    throw new CheckUnavailable('The text check could not run', { cause: error });
  }
  if (action === 'GUARDRAIL_INTERVENED') {
    throw new Refusal(refuse(STATUS_UNPROCESSABLE, 'MODERATION_REJECTED'));
  }
  if (action !== 'NONE') throw new CheckUnavailable(`Unknown guardrail answer ${String(action)}`);
}
