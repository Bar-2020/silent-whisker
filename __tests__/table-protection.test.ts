import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

const TERRAFORM_DIRS = ['../infra/app', '../infra/bootstrap'].map((dir) => resolve(__dirname, dir));

/**
 * Every DynamoDB table the app's Terraform makes has delete protection on (D-77), so a mistaken
 * `terraform destroy` or a replacement cannot drop user data. A Terraform test could only check the
 * tables that exist today; this reads every `.tf` file in infra/app and infra/bootstrap, so a table added later is checked too.
 */
describe('DynamoDB tables (D-77)', () => {
  const tables = TERRAFORM_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((file) => file.endsWith('.tf'))
      .flatMap((file) => {
        const text = readFileSync(join(dir, file), 'utf8');
        return [...text.matchAll(/resource "aws_dynamodb_table" "(\w+)" \{([\s\S]*?)\n\}/g)].map(
          (match) => ({ name: match[1], body: match[2] })
        );
      })
  );

  it('finds the tables it is supposed to check', () => {
    expect(tables.map((table) => table.name)).toContain('daily_usage_counters');
  });

  it.each(tables)('$name has delete protection on', ({ body }) => {
    const lines = body.split('\n').map((line) => line.replaceAll(' ', ''));
    expect(lines).toContain('deletion_protection_enabled=true');
  });
});
