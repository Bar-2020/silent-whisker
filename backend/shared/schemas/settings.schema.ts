import { z } from 'zod';

const setting = z.string().min(1);

/** The settings Terraform gives each Lambda (infra/app), by handler. */
export const getProfileSettings = z.object({ USERS_TABLE: setting });

export const deleteProfileSettings = z.object({ USERS_TABLE: setting, USER_POOL_ID: setting });
export type DeleteProfileSettings = z.infer<typeof deleteProfileSettings>;

export const updateProfileSettings = z.object({
  USERS_TABLE: setting,
  COUNTERS_TABLE: setting,
  /** The site's bucket, where the city list is (D-117). */
  SITE_BUCKET: setting,
  ALERT_TOPIC_ARN: setting,
  GUARDRAIL_ID: setting,
  GUARDRAIL_VERSION: setting,
});
export type UpdateProfileSettings = z.infer<typeof updateProfileSettings>;

/** The two settings that name the text moderation guardrail (infra/app/text-moderation.tf). */
export type GuardrailSettings = Pick<UpdateProfileSettings, 'GUARDRAIL_ID' | 'GUARDRAIL_VERSION'>;
