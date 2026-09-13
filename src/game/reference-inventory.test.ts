import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
// @ts-expect-error Node-only offline helper has no declaration file.
import { reviewCategory, referenceInventory } from '../../scripts/reference-inventory.mjs';

it('keeps capture success separate from visual acceptance', () => {
  expect(reviewCategory('accepted: useful exterior')).toBe('accepted');
  expect(reviewCategory('accepted: limited detail-only reference')).toBe('limited');
  expect(reviewCategory('rejected: stale pixels')).toBe('rejected');
  expect(reviewCategory('pending')).toBe('pending');
  expect(reviewCategory(undefined)).toBe('pending');
});

it('checks legacy multi-frame manifests and flags damaged browser images offline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'blockplay-inventory-'));
  try {
    const directory = join(root, 'marina-bay', 'references');
    await mkdir(directory, { recursive: true });
    const bytes = Buffer.from('cached fixture');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await writeFile(join(directory, 'old.jpg'), bytes);
    await writeFile(join(directory, 'panorama.json'), JSON.stringify({ frames: [{ file: 'reconstruction/marina-bay/references/old.jpg', sha256 }] }));
    await writeFile(join(directory, 'new.png'), bytes);
    await writeFile(join(directory, 'new.json'), JSON.stringify({ file: 'reconstruction/marina-bay/references/new.png', sha256: 'wrong', visualReview: 'rejected: test' }));
    const [inventory] = await referenceInventory(root);
    expect(inventory.images).toBe(2);
    expect(inventory.pending).toBe(1);
    expect(inventory.rejected).toBe(1);
    expect(inventory.invalid).toEqual(['new.png']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
