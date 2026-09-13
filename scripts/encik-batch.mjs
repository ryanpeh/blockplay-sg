// Paid generation is explicit. Completed clips are reused; ambiguous attempts never auto-retry.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ENCIK_LINES } from '../src/game/fps-callouts.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
export const selection = { audition: '36b76e0cf1bd', candidate: 3, generatedVoiceId: 'wLqaYCs3ytxhLj7cRE8x' };
export const settings = { model_id: 'eleven_v3', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: false }, seed: 21 };
export const lines = Object.entries(ENCIK_LINES).flatMap(([event, texts]) => texts.map((text, index) => ({ id: `${event}-${index + 1}`, event, index, text })));
const hash = value => createHash('sha256').update(value).digest('hex');
export const batchId = hash(JSON.stringify({ selection, settings, lines })).slice(0, 12);
const cacheRoot = path.join(root, '.cache/encik-batch');
export const batchDirectory = path.join(cacheRoot, batchId);
export const publicDirectory = path.join(root, 'public/audio/encik');
const readJson = async file => { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const writeJson = (file, data, options) => fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', options);

export async function once({ directory, id, request, endpoint, key, fetcher = fetch, binary = false }) {
  await fs.mkdir(directory, { recursive: true });
  const marker = path.join(directory, id + '.json');
  const fingerprint = hash(JSON.stringify({ endpoint, request }));
  const previous = await readJson(marker);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw Error(`${id}: request changed; inspect its existing attempt.`);
    if (previous.status !== 'complete') throw Error(`${id}: previous ${previous.status} attempt needs review. No automatic retry.`);
    if (binary && hash(await fs.readFile(path.join(directory, id + '.mp3'))) !== previous.sha256) throw Error(`${id}: cached audio checksum mismatch.`);
    return previous;
  }
  const attempt = { fingerprint, status: 'submitted', startedAt: new Date().toISOString(), request };
  await writeJson(marker, attempt, { flag: 'wx' });
  let response;
  try {
    response = await fetcher(endpoint, { method: 'POST', headers: { 'xi-api-key': key.trim(), 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(300000) });
  } catch { throw Error(`${id}: connection failed; may have consumed credits. Inspect recorded attempt before retrying.`); }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const message = String(detail.detail?.message ?? `HTTP ${response.status}`).replaceAll(key.trim(), '[redacted]');
    await writeJson(marker, { ...attempt, status: 'failed', httpStatus: response.status, message });
    throw Error(`${id}: ${message} No automatic retry.`);
  }
  let result;
  if (binary) {
    const data = Buffer.from(await response.arrayBuffer());
    // Preserve even an unexpected response for diagnosis instead of spending on a retry.
    await fs.writeFile(path.join(directory, id + '.mp3'), data, { flag: 'wx' });
    if (!/^audio\//i.test(response.headers.get('content-type') ?? '') || data.length < 1000) throw Error(`${id}: unexpected audio response saved for inspection.`);
    result = { bytes: data.length, sha256: hash(data), requestId: response.headers.get('request-id'), characterCost: response.headers.get('character-cost') };
  } else {
    const data = await response.json();
    await writeJson(path.join(directory, id + '-response.json'), data, { flag: 'wx' });
    if (!data.voice_id) throw Error('Voice creation returned no voice ID; inspect the saved response.');
    result = { voiceId: data.voice_id, name: data.name };
  }
  const complete = { ...attempt, ...result, status: 'complete', completedAt: new Date().toISOString() };
  await writeJson(marker, complete);
  return complete;
}

export async function usage(key) {
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key.trim() }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Subscription check failed (HTTP ${response.status}).`);
  const s = await response.json();
  if (!s.tier || s.tier === 'free' || !Number.isFinite(s.character_count) || !Number.isFinite(s.character_limit)) throw Error('Could not verify paid-plan included credits.');
  return { checkedAt: new Date().toISOString(), tier: s.tier, used: s.character_count, limit: s.character_limit };
}

async function generate(key) {
  if (!key?.trim()) throw Error('ELEVENLABS_API_KEY is required in the private environment.');
  const audition = await readJson(path.join(root, '.cache/encik-audition', selection.audition, 'attempt.json'));
  if (audition?.previews?.[selection.candidate - 1]?.generatedVoiceId !== selection.generatedVoiceId) throw Error('Selected audition does not match the approved candidate.');
  await fs.mkdir(batchDirectory, { recursive: true });
  const before = await usage(key);
  if (before.limit - before.used < lines.reduce((sum, line) => sum + line.text.length, 0) * 2) throw Error('Insufficient included quota reserved for this batch.');
  if (!await readJson(path.join(batchDirectory, 'usage-before.json'))) await writeJson(path.join(batchDirectory, 'usage-before.json'), before);
  console.log(JSON.stringify({ batchId, lines: lines.length, characters: lines.reduce((n, l) => n + l.text.length, 0), before }));
  const voice = await once({ directory: cacheRoot, id: 'voice-round4-candidate3', request: { voice_name: 'Blockplay Encik — Round 4 Candidate 3', voice_description: audition.request.voice_description, generated_voice_id: selection.generatedVoiceId }, endpoint: 'https://api.elevenlabs.io/v1/text-to-voice', key });
  console.log('Selected Encik voice saved; generating/reusing 48 callout clips.');
  const clips = [];
  for (const [i, line] of lines.entries()) {
    const generated = await once({ directory: batchDirectory, id: line.id, request: { ...settings, text: line.text }, endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}?output_format=mp3_44100_128`, key, binary: true });
    const file = `${line.id}-${generated.sha256.slice(0, 10)}.mp3`;
    clips.push({ ...line, file, bytes: generated.bytes, sha256: generated.sha256 });
    console.log(`[${i + 1}/${lines.length}] ${line.id}: ${generated.bytes} bytes cached`);
  }
  // Publish only when the full pack is present; source and subtitles use the exact same text.
  await fs.mkdir(publicDirectory, { recursive: true });
  for (const clip of clips) await fs.copyFile(path.join(batchDirectory, clip.id + '.mp3'), path.join(publicDirectory, clip.file));
  const manifest = { version: 1, batchId, provider: 'ElevenLabs', model: settings.model_id, voice: 'Encik — Round 4 Candidate 3', clips };
  await writeJson(path.join(publicDirectory, 'manifest.json'), manifest);
  const cards = clips.map(c => `<section><h2>${c.id}</h2><p>${c.text}</p><audio controls preload="none" src="${c.file}"></audio></section>`).join('');
  await fs.writeFile(path.join(publicDirectory, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Encik callout pack</title><style>body{max-width:760px;margin:30px auto;padding:20px;background:#15251f;color:#f3e7c8;font:16px/1.6 system-ui}section{padding:10px 0;border-top:1px solid #647b66}audio{width:100%}h2{font-size:18px}</style><h1>Encik · 48 callouts</h1><p>Round 4 candidate 3 · Singaporean Encik</p>${cards}`);
  const after = await usage(key).catch(() => null);
  await writeJson(path.join(batchDirectory, 'usage-after.json'), after);
  console.log(JSON.stringify({ publicDirectory, after, observedCreditChange: after ? after.used - before.used : null }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--generate')) {
    try { await generate(process.env.ELEVENLABS_API_KEY); } catch (error) { console.error(error.message); process.exitCode = 1; }
  } else console.log(JSON.stringify({ mode: 'dry-run; no requests', selection, settings, batchId, characters: lines.reduce((n, l) => n + l.text.length, 0), lines }, null, 2));
}
