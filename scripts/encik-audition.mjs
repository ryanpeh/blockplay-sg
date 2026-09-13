// One Voice Design audition on the user's paid plan. Dry run by default; never retries a generation.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const audition = {
  model_id: 'eleven_ttv_v3',
  voice_description: 'Singaporean man around sixty speaking everyday colloquial Singapore English. Familiar kopitiam speech, slightly nasal, with natural Singlish rhythm and vowels. Audibly older, with a heavy chest resonance, coarse grainy rasp and a worn, dry throaty edge. Measured, slightly dragging phrases with gravelly ends; a seasoned uncle who takes his time because everyone waits for him. Blunt, earthy and casually foul-mouthed. An old encik who has spent thirty years scolding recruits: weary irritation, biting dry humour, abrupt bursts of emphasis. Conversational grumbling that snaps into a short bark. Rough, unpolished delivery with clear words.',
  text: 'Eh, recruit! Bloody hell, you shooting the wall for what? Go around lah!\nReloading! Don\'t stand there like a blur sotong. Move!',
  auto_generate_text: false, should_enhance: false, stream_previews: false,
  guidance_scale: 25, seed: 21,
};
const fingerprint = createHash('sha256').update(JSON.stringify(audition)).digest('hex').slice(0, 12);
export const outputDirectory = fileURLToPath(new URL(`../.cache/encik-audition/${fingerprint}/`, import.meta.url));

export async function generateAudition({ key, directory = outputDirectory, fetcher = fetch } = {}) {
  if (!key?.trim()) throw new Error('Add ELEVENLABS_API_KEY to .env.local first. No requests sent.');
  const headers = { 'xi-api-key': key.trim(), 'Content-Type': 'application/json' };
  const subscription = async () => {
    const response = await fetcher('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Subscription check failed (HTTP ${response.status}). Check key permissions for User read access.`);
    const data = await response.json();
    if (!data.tier || data.tier === 'free') throw new Error('Voice Design through the API requires a paid plan. No generation sent.');
    if (!Number.isFinite(data.character_count) || !Number.isFinite(data.character_limit)) throw new Error('Could not verify remaining credits.');
    return { tier: data.tier, used: data.character_count, limit: data.character_limit };
  };
  await fs.mkdir(directory, { recursive: true });
  // A permanent attempt marker also stops accidental retries after a timeout.
  const marker = new URL('attempt.json', pathToFileURL(directory + '/'));
  try { await fs.access(marker); throw new Error('This audition was already attempted. Review its cached results/status before spending more credits.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const before = await subscription();
  if (before.limit - before.used < audition.text.length * 3) throw new Error('Not enough included credits reserved for this audition. No generation sent.');
  const attempt = { status: 'submitted', startedAt: new Date().toISOString(), before, request: audition };
  await fs.writeFile(marker, JSON.stringify(attempt, null, 2), { flag: 'wx' });
  let response;
  try {
    response = await fetcher('https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128', {
      method: 'POST', headers, body: JSON.stringify(audition), signal: AbortSignal.timeout(180000),
    });
  } catch {
    throw new Error('Generation connection failed or timed out. It may have consumed credits; the attempt is recorded and will not retry automatically.');
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const errorCode = typeof detail.detail?.status === 'string' ? detail.detail.status : null;
    const message = typeof detail.detail?.message === 'string' ? detail.detail.message.replaceAll(key.trim(), '[redacted]') : 'Check the ElevenLabs dashboard.';
    await fs.writeFile(marker, JSON.stringify({ ...attempt, status: 'failed', httpStatus: response.status, errorCode, message }, null, 2));
    throw new Error(`Voice Design failed (HTTP ${response.status}${errorCode ? ', ' + errorCode : ''}): ${message} No automatic retry was made.`);
  }
  const data = await response.json();
  // Keep the original result before processing so an interruption cannot require regeneration.
  await fs.writeFile(new URL('response.json', marker), JSON.stringify(data));
  if (!Array.isArray(data.previews) || !data.previews.length) throw new Error('No previews returned. Raw response saved for inspection.');
  const previews = [];
  for (const [index, preview] of data.previews.entries()) {
    if (typeof preview.audio_base_64 !== 'string' || !preview.audio_base_64.length) throw new Error('Preview audio missing. Inspect the saved response; do not regenerate.');
    const file = `candidate-${index + 1}.mp3`;
    await fs.writeFile(new URL(file, marker), Buffer.from(preview.audio_base_64, 'base64'));
    previews.push({ file, generatedVoiceId: preview.generated_voice_id, duration: preview.duration_secs });
  }
  const after = await subscription().catch(() => null);
  const result = { ...attempt, status: 'complete', previews, after, observedCreditChange: after ? after.used - before.used : null };
  await fs.writeFile(marker, JSON.stringify(result, null, 2));
  const cards = previews.map((p, i) => `<section><h2>Candidate ${i + 1}</h2><audio controls preload="none" src="${p.file}"></audio></section>`).join('');
  await fs.writeFile(new URL('index.html', marker), `<!doctype html><meta charset="utf-8"><title>Encik voice audition</title><style>body{max-width:760px;margin:40px auto;padding:20px;background:#15251f;color:#f3e7c8;font:16px/1.6 system-ui}section{padding:12px 0;border-top:1px solid #647b66}audio{width:100%}h2{font-size:18px}p{white-space:pre-line}</style><h1>Encik · two-line audition</h1><p>${audition.text}</p>${cards}<p>Listen for Singaporean pronunciation, clear commands and comic timing. These are previews; no voice has been saved or added to the game.</p>`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--generate')) {
    try {
      const result = await generateAudition({ key: process.env.ELEVENLABS_API_KEY });
      console.log(JSON.stringify({ previews: result.previews, observedCreditChange: result.observedCreditChange, directory: outputDirectory }, null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  } else console.log(JSON.stringify({ mode: 'dry-run; no network calls', characters: audition.text.length, request: audition, directory: outputDirectory }, null, 2));
}
