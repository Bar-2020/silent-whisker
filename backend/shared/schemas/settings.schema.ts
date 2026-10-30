import { z } from 'zod';

const setting = z.string().min(1);

/** The settings Terraform gives each Lambda (infra/app), by handler. */
export const getProfileSettings = z.object({ USERS_TABLE: setting });

export const updateProfileSettings = z.object({
  USERS_TABLE: setting,
  GEOCODE_TABLE: setting,
  COUNTERS_TABLE: setting,
  ALERT_TOPIC_ARN: setting,
  GUARDRAIL_ID: setting,
  GUARDRAIL_VERSION: setting,
});
export type UpdateProfileSettings = z.infer<typeof updateProfileSettings>;

/** The two settings that name the text moderation guardrail (infra/app/text-moderation.tf). */
export type GuardrailSettings = Pick<UpdateProfileSettings, 'GUARDRAIL_ID' | 'GUARDRAIL_VERSION'>;
