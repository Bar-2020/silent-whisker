/** A setting Terraform gives the Lambda; a missing one is a deploy mistake, so it fails loudly. */
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
