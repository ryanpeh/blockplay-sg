import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { audition, generateAudition } from './encik-audition.mjs';
const free = { tier: 'free', character_count: 0, character_limit: 10000 };
const json = value => new Response(JSON.stringify(value));
async function temporary(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'encik-audition-test-'));
  try { await run(directory); } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
test('keeps preview text to two short lines and refuses missing keys, paid accounts and exhausted credits', async () => {
  assert.equal(audition.text.split('\n').length, 2); assert(audition.text.length >= 100 && audition.text.length < 150);
  assert.equal(audition.auto_generate_text, false);
  await temporary(async directory => {
    await assert.rejects(generateAudition({ directory, fetcher: () => { throw Error('must not request'); } }), /API_KEY/);
    for (const subscription of [{ ...free, tier: 'starter' }, { ...free, character_count: 9999 }]) {
      let posts = 0;
      await assert.rejects(generateAudition({ directory, key: 'test-key', fetcher: async (_url, options) => { if (options.method === 'POST') posts++; return json(subscription); } }), /Free tier|free credits/);
      assert.equal(posts, 0);
    }
  });
});
test('saves previews from one request, measures usage and blocks accidental regeneration', async () => {
  await temporary(async directory => {
    let posts = 0;
    const fetcher = async (_url, options) => {
      if (options.method !== 'POST') return json({ ...free, character_count: posts ? 118 : 0 });
      posts++; assert.equal(JSON.parse(options.body).text, audition.text);
      return json({ previews: [{ audio_base_64: Buffer.from('test fixture').toString('base64'), generated_voice_id: 'test-id', duration_secs: 8 }] });
    };
    const result = await generateAudition({ directory, key: 'test-key', fetcher });
    assert.equal(posts, 1); assert.equal(result.observedCreditChange, 118);
    assert.equal(await fs.readFile(path.join(directory, 'candidate-1.mp3'), 'utf8'), 'test fixture');
    assert.match(await fs.readFile(path.join(directory, 'index.html'), 'utf8'), /audio controls/);
    assert.doesNotMatch(await fs.readFile(path.join(directory, 'attempt.json'), 'utf8'), /test-key/);
    await assert.rejects(generateAudition({ directory, key: 'test-key', fetcher }), /already attempted/);
    assert.equal(posts, 1);
  });
});
test('a timed-out generation remains blocked from automatic retries', async () => {
  await temporary(async directory => {
    let posts = 0;
    const fetcher = async (_url, options) => { if (options.method === 'POST') { posts++; throw Error('timeout'); } return json(free); };
    await assert.rejects(generateAudition({ directory, key: 'test-key', fetcher }), /will not retry/);
    await assert.rejects(generateAudition({ directory, key: 'test-key', fetcher }), /already attempted/);
    assert.equal(posts, 1);
  });
});
test('preserves a provider plan restriction without logging credentials', async () => {
  await temporary(async directory => {
    const fetcher = async (_url, options) => options.method === 'POST'
      ? new Response(JSON.stringify({ detail: { status: 'feature_unavailable', message: 'Paid plan required. test-key' } }), { status: 403 })
      : json(free);
    await assert.rejects(generateAudition({ directory, key: 'test-key', fetcher }), /feature_unavailable/);
    const saved = await fs.readFile(path.join(directory, 'attempt.json'), 'utf8');
    assert.equal(JSON.parse(saved).errorCode, 'feature_unavailable');
    assert.doesNotMatch(saved, /test-key/);
  });
});
