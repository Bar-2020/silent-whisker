// Runs the photo check on a folder of photos and compares each answer with what it should be.
// Usage: node scripts/photo-check-test.mjs <photos-folder> [model-id]
// What it is for and how the photo set was made: scripts/photo-check-test/README.md (D-50).
// Needs the AWS CLI logged in to the project (AWS_PROFILE if it is not the default).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const PAUSE_BETWEEN_CALLS_MS = 4000;
const PAUSE_AFTER_THROTTLE_MS = 30000;
const ANSWERS = ['UNSAFE', 'NOT_CAT', 'CAT'];
const IMAGE_FORMATS = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png' };

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const check = readJson('../shared/constants/photo-check.json');
const { selected_region: region } = readJson('../shared/constants/aws.json');
const expected = readJson('./photo-check-test/expected.json');

const [folder, modelId = check.model_id] = process.argv.slice(2);
if (!folder) {
  console.error('usage: node scripts/photo-check-test.mjs <photos-folder> [model-id]');
  process.exit(2);
}

const work = mkdtempSync(join(tmpdir(), 'photo-check-test-'));
const inferenceFile = join(work, 'inference.json');
writeFileSync(
  inferenceFile,
  JSON.stringify({ maxTokens: check.max_tokens, temperature: check.temperature })
);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const fileUri = (path) => `file://${path.replaceAll('\\', '/')}`;

/** One Converse call (the image and the prompt in one message). Returns the model's text. */
function ask(photoPath) {
  const message = [
    {
      role: 'user',
      content: [
        {
          image: {
            format: IMAGE_FORMATS[extname(photoPath).toLowerCase()],
            source: { bytes: readFileSync(photoPath).toString('base64') },
          },
        },
        { text: check.prompt },
      ],
    },
  ];
  const messageFile = join(work, 'message.json');
  writeFileSync(messageFile, JSON.stringify(message));
  const out = execFileSync(
    'aws',
    [
      ...['bedrock-runtime', 'converse', '--region', region, '--model-id', modelId],
      ...['--messages', fileUri(messageFile), '--inference-config', fileUri(inferenceFile)],
      ...['--output', 'json', '--no-cli-pager'],
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 20 }
  );
  const reply = JSON.parse(out);
  const text = reply.output.message.content.map((part) => part.text ?? '').join('');
  return { text, tokens: reply.usage.inputTokens };
}

/** Asks once; after a throttling error waits 30 seconds and asks once more. */
async function askWithRetry(photoPath) {
  try {
    return ask(photoPath);
  } catch (error) {
    if (!/Throttling|TooManyRequests/.test(String(error.stderr))) throw error;
    await sleep(PAUSE_AFTER_THROTTLE_MS);
    return ask(photoPath);
  }
}

const results = [];
for (const [file, want] of Object.entries(expected)) {
  const photoPath = resolve(folder, file);
  if (!existsSync(photoPath)) {
    console.log(`${file}: missing, skipped`);
    continue;
  }
  if (results.length > 0) await sleep(PAUSE_BETWEEN_CALLS_MS);
  let got;
  let tokens;
  try {
    ({ text: got, tokens } = await askWithRetry(photoPath));
    got = (got.trim().split(/\s+/)[0] ?? '').toUpperCase().replaceAll(/[^A-Z_]/g, '');
    if (!ANSWERS.includes(got)) got = `FORMAT_ERROR(${got})`;
  } catch (error) {
    got = `ERROR(${String(error.stderr ?? error.message)
      .trim()
      .split('\n')
      .pop()})`;
  }
  results.push({ file, want, got, tokens });
  console.log(`${file}: expected ${want}, got ${got} ${got === want ? '' : '<-- differs'}`);
}

// A refusal of the wrong kind (NOT_CAT where UNSAFE was expected) still keeps the photo hidden, so
// the two numbers that matter are the photos that got through and the real cats that were refused.
const refusals = results.filter((r) => r.want !== 'CAT');
const letThrough = refusals.filter((r) => r.got === 'CAT');
const wronglyRefused = results.filter((r) => r.want === 'CAT' && r.got !== 'CAT');
const exact = results.filter((r) => r.got === r.want);
const average = Math.round(
  results.reduce((sum, r) => sum + (r.tokens ?? 0), 0) / Math.max(results.length, 1)
);
console.log(`\nmodel ${modelId}: exact answers ${exact.length} of ${results.length}`);
console.log(
  `let through (should have been refused): ${letThrough.map((r) => r.file).join(', ') || 'none'}`
);
console.log(
  `real cats refused: ${wronglyRefused.map((r) => `${r.file}=${r.got}`).join(', ') || 'none'}`
);
console.log(`average input tokens per photo: ${average}`);
