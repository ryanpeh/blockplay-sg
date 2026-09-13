import { readFile } from 'node:fs/promises';
import { isStaticAttempt } from './api-budget.mjs';
const ledger = JSON.parse(await readFile('reconstruction/api-usage.json', 'utf8'));
const count = kind => ledger.attempts.filter(entry => entry.kind.startsWith(kind)).length;
const capturedImages = count('image');
const staticAttempts = ledger.attempts.filter(entry => isStaticAttempt(entry.kind)).length;
console.log(JSON.stringify({
  recordedAttempts: ledger.attempts.length,
  conservativeLimit: ledger.limit,
  staticAttemptsAgainstCap: staticAttempts,
  conservativeRemaining: Math.max(0, ledger.limit - staticAttempts),
  staticImageAttempts: count('image'),
  staticMetadataAttempts: count('metadata'),
  mapsJavaScriptSelectionAttempts: ledger.attempts.filter(entry => entry.kind.startsWith('maps-javascript') && !entry.kind.startsWith('maps-javascript-panorama')).length,
  browserPanoramaLoadAttempts: count('maps-javascript-panorama'),
  browserScreenshotAttempts: count('browser-screenshot'),
  additionalImageAllowance: ledger.imageAllowance ? { used: capturedImages - ledger.imageAllowance.baselineStaticImageAttempts, limit: ledger.imageAllowance.maxAdditionalImages, remaining: Math.max(0, ledger.imageAllowance.maxAdditionalImages - capturedImages + ledger.imageAllowance.baselineStaticImageAttempts) } : undefined,
  regionalImageAllowances: ledger.regionImageAllowances ? Object.fromEntries(Object.entries(ledger.regionImageAllowances).map(([region, allowance]) => {
    const used = ledger.attempts.filter(entry => entry.kind.startsWith('image') && entry.location === region).length - allowance.baselineStaticImageAttempts;
    return [region, { used, limit: allowance.maxAdditionalImages, remaining: Math.max(0, allowance.maxAdditionalImages - used) }];
  })) : undefined,
  note: 'Static metadata is conservatively included in the local Static cap. Browser loads/screenshots are tracked separately and do not consume either Static allowance. This is not a Cloud billing report.',
}, null, 2));
