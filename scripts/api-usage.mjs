import { readFile } from 'node:fs/promises';
const ledger = JSON.parse(await readFile('reconstruction/api-usage.json', 'utf8'));
const count = kind => ledger.attempts.filter(entry => entry.kind.startsWith(kind)).length;
console.log(JSON.stringify({
  recordedAttempts: ledger.attempts.length,
  conservativeLimit: ledger.limit,
  conservativeRemaining: Math.max(0, ledger.limit - ledger.attempts.length),
  staticImageAttempts: count('image'),
  staticMetadataAttempts: count('metadata'),
  mapsJavaScriptSelectionAttempts: count('maps-javascript'),
  note: 'Google documents Static metadata as not consuming quota. All capture attempts still count against our stricter local cap. This is not a Cloud billing report.',
}, null, 2));
