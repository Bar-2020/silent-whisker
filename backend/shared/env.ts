import { z } from 'zod';

/** A Lambda's settings from Terraform. A missing or empty one is a deploy mistake, and all are named at once. */
export function readSettings<S extends z.ZodType>(schema: S): z.infer<S> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`The settings of this Lambda are wrong:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
