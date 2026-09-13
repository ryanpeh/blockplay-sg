import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once, lines, selection } from './encik-batch.mjs';
async function temporary(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'encik-batch-test-'));
  try { await run({ directory, id: 'test', request: { text: 'A test line' }, endpoint: 'https://example.invalid/test', key: 'private-test-key' }); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
}
test('plan covers 48 unique lines and the approved candidate', () => {
  assert.equal(lines.length, 48); assert.equal(new Set(lines.map(l => l.id)).size, 48);
  assert.equal(lines.reduce((n, l) => n + l.text.length, 0), 2079);
  assert.equal(selection.generatedVoiceId, 'wLqaYCs3ytxhLj7cRE8x');
});
test('completed audio is reused without POSTs and refuses changed requests or corrupt files', async () => temporary(async args => {
  let posts = 0;
  const fetcher = async () => { posts++; return new Response(Buffer.alloc(1200, 42), { headers: { 'content-type': 'audio/mpeg' } }); };
  await once({ ...args, fetcher, binary: true });
  await once({ ...args, fetcher, binary: true }); assert.equal(posts, 1);
  await assert.rejects(once({ ...args, request: { text: 'changed' }, fetcher, binary: true }), /request changed/);
  await fs.writeFile(path.join(args.directory, 'test.mp3'), 'corrupt');
  await assert.rejects(once({ ...args, fetcher, binary: true }), /checksum mismatch/); assert.equal(posts, 1);
}));
test('uncertain timeouts block retries', async () => temporary(async args => {
  let posts = 0;
  const fetcher = async () => { posts++; throw Error('network'); };
  await assert.rejects(once({ ...args, fetcher }), /may have consumed credits/);
  await assert.rejects(once({ ...args, fetcher }), /No automatic retry/); assert.equal(posts, 1);
}));
test('provider errors are redacted and recorded without automatic retry', async () => temporary(async args => {
  const fetcher = async () => new Response(JSON.stringify({ detail: { message: 'Denied private-test-key' } }), { status: 401 });
  await assert.rejects(once({ ...args, fetcher }), /Denied \[redacted\]/);
  assert.doesNotMatch(await fs.readFile(path.join(args.directory, 'test.json'), 'utf8'), /private-test-key/);
}));
test('saving a voice is cached and never creates another voice on rerun', async () => temporary(async args => {
  let posts = 0;
  const fetcher = async () => { posts++; return new Response(JSON.stringify({ voice_id: 'saved-voice' })); };
  assert.equal((await once({ ...args, fetcher })).voiceId, 'saved-voice');
  assert.equal((await once({ ...args, fetcher })).voiceId, 'saved-voice'); assert.equal(posts, 1);
}));
