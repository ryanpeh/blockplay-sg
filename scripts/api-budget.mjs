import { readFile, writeFile, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function withBudget(task, ledgerPath = resolve('reconstruction/api-usage.json')) {
  const lockPath = `${ledgerPath}.lock`;
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch { throw new Error('Another capture may be running. Check reconstruction/api-usage.json.lock before retrying; do not run captures concurrently.'); }
  try {
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    if (!Number.isInteger(ledger.limit) || ledger.limit < 1 || ledger.limit > 1000 || !Array.isArray(ledger.attempts)) throw new Error('Invalid usage ledger; refusing API requests.');
    const save = () => writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
    const request = async (kind, callback) => {
      if (ledger.attempts.length >= ledger.limit) throw new Error(`Local API budget exhausted (${ledger.limit}).`);
      const entry = { id: randomUUID(), date: new Date().toISOString(), kind, location: 'marina-bay', result: 'attempt reserved; outcome unknown' };
      ledger.attempts.push(entry);
      await save(); // Count BEFORE the request, even if interrupted or rejected.
      try {
        const result = await callback();
        entry.result = result.ok ? `HTTP ${result.status}` : `HTTP ${result.status}: failed`;
        if (kind === 'metadata') {
          try { entry.result = `${(await result.clone().json()).status || 'unknown'} (HTTP ${result.status})`; } catch {}
        }
        await save();
        console.log(`Capture API attempts recorded: ${ledger.attempts.length}/${ledger.limit}`);
        return result;
      } catch (error) {
        entry.result = 'network failure or interrupted request'; await save(); throw error;
      }
    };
    return await task(request, ledger);
  } finally { await lock.close(); await unlink(lockPath); }
}
