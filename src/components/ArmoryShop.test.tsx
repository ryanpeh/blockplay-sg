import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ArmoryShop from './ArmoryShop';
import { createProfile } from '../game/armory-state';
import { xpForLevel } from '../game/progression';
import type { ArmoryStore } from '../game/use-armory';

it('shows maximum-level copy instead of asking level 50 players to keep climbing', () => {
  const profile = createProfile(); profile.xp = xpForLevel(50);
  const store: ArmoryStore = { profile, buy: vi.fn(), equipItem: vi.fn(), remove: vi.fn(), award: vi.fn(), awardElimination: vi.fn(), demoTopUp: vi.fn(), message: '', saveError: false };
  const html = renderToStaticMarkup(<ArmoryShop store={store} onEnterRange={() => {}} />);
  expect(html).toContain('Maximum level reached');
  expect(html).not.toContain('Keep climbing to level 50');
});
