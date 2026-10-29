import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

const APP_DIR = resolve(__dirname, '../infra/app');

/**
 * Every DynamoDB table the app's Terraform makes has delete protection on (D-73), so a mistaken
 * `terraform destroy` or a replacement cannot drop user data. A Terraform test could only check the
 * tables that exist today; this reads every `.tf` file, so a table added later is checked too.
 */
describe('DynamoDB tables (D-73)', () => {
  const tables = readdirSync(APP_DIR)
    .filter((file) => file.endsWith('.tf'))
    .flatMap((file) => {
      const text = readFileSync(join(APP_DIR, file), 'utf8');
      return [...text.matchAll(/resource "aws_dynamodb_table" "(\w+)" \{([\s\S]*?)\n\}/g)].map(
        (match) => ({ name: match[1], body: match[2] })
      );
    });

  it('finds the tables it is supposed to check', () => {
    expect(tables.map((table) => table.name)).toContain('daily_usage_counters');
  });

  it.each(tables)('$name has delete protection on', ({ body }) => {
    const lines = body.split('\n').map((line) => line.replaceAll(' ', ''));
    expect(lines).toContain('deletion_protection_enabled=true');
  });
});
