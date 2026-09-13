import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('loads the companion dependency graph with the same native TypeScript loader as pnpm server', () => {
  // Vite/Vitest resolve extensionless imports; Node's ESM loader does not.
  const output = execFileSync(process.execPath, [
    '--experimental-strip-types', '--input-type=module', '--eval',
    "await import('./server/adventure-api.ts'); console.log('loaded');",
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000 });
  expect(output.trim()).toBe('loaded');
});
