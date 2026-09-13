import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
// @ts-expect-error Shared build-time JavaScript module.
import { withBudget } from '../../scripts/api-budget.mjs';

it('enforces the Static image allowance but excludes browser loads/screenshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blockplay-budget-'));
  const path = join(directory, 'usage.json');
  try {
    await writeFile(path, JSON.stringify({ limit: 1000, imageAllowance: { baselineStaticImageAttempts: 1, maxAdditionalImages: 1 }, attempts: [{ kind: 'image-old' }] }));
    await withBudget(async (request: (kind: string, callback: () => Promise<Response>) => Promise<Response>) => {
      await request('browser-screenshot-reference', async () => new Response());
      await request('image-reference', async () => new Response());
      await expect(request('image-reference', async () => { throw new Error('Must not call network'); })).rejects.toThrow('allowance exhausted');
      await request('maps-javascript-panorama-load', async () => new Response());
      await request('metadata', async () => Response.json({ status: 'OK' }));
    }, path);
    expect(JSON.parse(await readFile(path, 'utf8')).attempts).toHaveLength(5);
  } finally { await rm(directory, { recursive: true }); }
});

it('persists an attempt before calling the network and stops at the limit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blockplay-budget-'));
  const path = join(directory, 'usage.json');
  try {
    await writeFile(path, JSON.stringify({ limit: 1, attempts: [] }));
    let calls = 0;
    await withBudget(async (request: (kind: string, callback: () => Promise<Response>) => Promise<Response>) => {
      await request('metadata', async () => {
        calls++;
        expect(JSON.parse(await readFile(path, 'utf8')).attempts).toHaveLength(1);
        return Response.json({ status: 'REQUEST_DENIED' });
      });
      await expect(request('image', async () => { calls++; return new Response(); })).rejects.toThrow('budget exhausted');
      // Browser events remain allowed even when the Static cap is exhausted.
      await request('browser-screenshot', async () => new Response());
      await request('maps-javascript-panorama-load', async () => new Response());
    }, path);
    expect(calls).toBe(1);
    expect(JSON.parse(await readFile(path, 'utf8')).attempts[0].result).toContain('REQUEST_DENIED');
  } finally { await rm(directory, { recursive: true }); }
});

it('counts a failed network attempt instead of refunding it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blockplay-budget-'));
  const path = join(directory, 'usage.json');
  try {
    await writeFile(path, JSON.stringify({ limit: 1000, attempts: [] }));
    await expect(withBudget(async (request: (kind: string, callback: () => Promise<Response>) => Promise<Response>) => {
      await request('image', async () => { throw new Error('network unavailable'); });
    }, path)).rejects.toThrow('network unavailable');
    expect(JSON.parse(await readFile(path, 'utf8')).attempts).toHaveLength(1);
  } finally { await rm(directory, { recursive: true }); }
});
