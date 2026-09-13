import { describe, expect, it } from 'vitest';
import { applyArmorDamage, claimElimination, claimReward, createProfile, equip, previewLoadout, purchase, resolveLoadout, restoreProfile, unequipAttachment, type ExerciseReward } from './armory-state';
import { itemById } from './armory-catalog';
import { progression, registerElimination, xpForLevel } from './progression';
import { advanceWeapon, beginReload, createLoadout } from './fps-rules';
const veteran = () => ({ ...createProfile(), xp: 5000, credits: 10000, tokens: 1000 });
const unlock = (id: string) => purchase(veteran(), id).profile;
const result: ExerciseReward = { id: 'round-1', hits: 8, shots: 30, landed: 28, elapsed: 20, combat: false };
describe('persistent armory economy', () => {
  it('charges the correct wallet once and keeps the input immutable', () => {
    const base = veteran(), first = purchase(base, 'sar-vanguard').profile, twice = purchase(first, 'sar-vanguard').profile;
    expect(first.tokens).toBe(760); expect(first.credits).toBe(base.credits); expect(base.owned).not.toContain('sar-vanguard'); expect(twice).toBe(first);
  });
  it('enforces level locks even when the wallet has enough tokens', () => {
    const base = createProfile(); expect(purchase(base, 'sar-vanguard').profile).toBe(base);
    expect(purchase({ ...base, xp: xpForLevel(3) }, 'sar-vanguard').profile.tokens).toBe(60);
  });
  it('rejects insufficient funds, unknown IDs, unowned equipment and wrong weapon families', () => {
    const poor = { ...veteran(), credits: 0 }; expect(purchase(poor, 'mag-quick').profile).toBe(poor); expect(purchase(poor, 'missing').profile).toBe(poor);
    expect(equip(poor, 'mag-quick', 0)).toBe(poor); const owner = unlock('sar-vanguard'); expect(equip(owner, 'sar-vanguard', 1)).toBe(owner);
  });
  it('recovers old, malformed or tampered save fields without equipping unowned items', () => {
    expect(restoreProfile('{')).toEqual(createProfile());
    const restored = restoreProfile(JSON.stringify({ version: 1, credits: -9, tokens: 'Infinity', owned: ['missing', 'sar-vanguard', 'sar-vanguard'], guns: [{ variant: 'ult-issued', skin: 'skin-gold', attachments: { optic: 'mag-quick' } }], plate: 'plate-elite', xp: 'oops' }));
    expect(restored.credits).toBe(0); expect(restored.tokens).toBe(300); expect(restored.xp).toBe(0); expect(restored.guns[0].variant).toBe('sar-issued'); expect(restored.guns[0].skin).toBe('skin-issued'); expect(restored.guns[0].attachments).toEqual({}); expect(restored.plate).toBe('plate-none'); expect(restored.owned.filter(id => id === 'sar-vanguard')).toHaveLength(1);
  });
  it('persists a complete equipped loadout', () => { const profile = equip(unlock('sar-vanguard'), 'sar-vanguard', 0); expect(restoreProfile(JSON.stringify(profile))).toEqual(profile); });
  it('awards kills and completion only once and rejects incomplete or malformed rewards', () => {
    const base = createProfile(), killed = claimElimination(base, 'round-1:kill:1'); expect(killed.xp).toBe(25); expect(claimElimination(killed, 'round-1:kill:1')).toBe(killed);
    const rewarded = claimReward(killed, result); expect(rewarded.credits).toBeGreaterThan(base.credits); expect(rewarded.xp).toBeGreaterThan(300); expect(claimReward(rewarded, result)).toBe(rewarded);
    expect(claimReward(base, { ...result, hits: 7 })).toBe(base); expect(claimReward(base, { ...result, shots: Infinity })).toBe(base); expect(claimReward(base, { ...result, landed: 31 })).toBe(base);
  });
});
describe('equipment reaches gameplay', () => {
  it('premium damage crosses a target-health breakpoint', () => {
    const base = resolveLoadout(createProfile()).weapons[0], elite = resolveLoadout(equip(unlock('sar-vanguard'), 'sar-vanguard', 0)).weapons[0];
    expect(Math.ceil(115 / base.damage)).toBe(4); expect(Math.ceil(115 / elite.damage)).toBe(3); expect(elite.capacity).toBe(36); expect(elite.interval).toBeLessThan(base.interval);
  });
  it('stacks attachments, replaces mutually exclusive magazines and uses resulting reload timing', () => {
    let profile = veteran(); for (const id of ['sar-vanguard', 'mag-quick', 'mag-extended', 'handling-stable']) profile = equip(purchase(profile, id).profile, id, 0);
    let spec = resolveLoadout(profile).weapons[0]; expect(spec.capacity).toBe(46); expect(spec.reload).toBeCloseTo(1.53 * 1.1); expect(spec.recoil).toBeCloseTo(.014 * .75);
    profile = equip(profile, 'mag-quick', 0); spec = resolveLoadout(profile).weapons[0]; expect(spec.capacity).toBe(36); expect(spec.reload).toBeCloseTo(1.53 * .85);
    const specs = resolveLoadout(profile).weapons, state = createLoadout(specs)[0]; state.magazine = 10; expect(beginReload(state, 0, specs)).toBe(true); advanceWeapon(state, 0, 1.31, specs); expect(state.magazine).toBe(36);
    profile = unequipAttachment(profile, 0, 'magazine'); expect(resolveLoadout(profile).weapons[0].reload).toBe(1.53);
  });
  it('skin previews do not spend currency, equip the real profile or alter stats', () => {
    const profile = createProfile(), before = resolveLoadout(profile), after = previewLoadout(profile, itemById('skin-gold')!, 0);
    expect(profile.guns[0].skin).toBe('skin-issued'); expect(profile.tokens).toBe(300); expect(after.weapons[0].equipment.skin).toBe('skin-gold'); expect(after.weapons[0].damage).toBe(before.weapons[0].damage); expect(after.weapons[0].reload).toBe(before.weapons[0].reload);
  });
  it('separates rig carrying capacity from armor protection', () => {
    const rig = resolveLoadout(equip(unlock('rig-lbs'), 'rig-lbs', 0)); expect(rig.armor).toBe(0); expect(rig.weapons[0].reserve).toBe(180);
    const plated = resolveLoadout(equip(unlock('plate-ceramic'), 'plate-ceramic', 0)); expect(plated.armor).toBe(75); expect(plated.mobility).toBe(.94);
  });
  it('absorbs only the configured share, then spills exhausted armor damage into health', () => {
    expect(applyArmorDamage(100, 75, 20, .65)).toEqual({ health: 93, armor: 62, blocked: 13 });
    expect(applyArmorDamage(100, 5, 20, .65)).toEqual({ health: 85, armor: 0, blocked: 5 });
    expect(applyArmorDamage(10, 0, 20, .65).health).toBe(0); expect(applyArmorDamage(100, 0, 20, 0).health).toBe(80);
  });
});
describe('levels and arcade announcements', () => {
  it('handles exact thresholds, level jumps, invalid XP and the level cap', () => {
    expect(progression(299).level).toBe(1); expect(progression(300).level).toBe(2); expect(progression(800).level).toBe(3); expect(progression(5000).level).toBe(7); expect(progression(NaN).level).toBe(1); expect(progression(1e9)).toMatchObject({ level: 50, progress: 1, remaining: 0 });
  });
  it('announces only eliminations inside a three-second chain and resets on a gap', () => {
    let chain = registerElimination({ count: 0, lastAt: -Infinity }, 10); expect(chain.label).toBe('');
    chain = registerElimination(chain, 13); expect(chain.label).toBe('DOUBLE KILL'); chain = registerElimination(chain, 15); expect(chain.label).toBe('TRIPLE KILL');
    chain = registerElimination(chain, 18.01); expect(chain.count).toBe(1); expect(chain.label).toBe('');
  });
  it('escalates through rampage and caps the callout text for longer chains', () => {
    let chain = registerElimination({ count: 0, lastAt: -Infinity }, 0); for (let i = 1; i < 10; i++) chain = registerElimination(chain, i);
    expect(chain.count).toBe(10); expect(chain.label).toBe('RAMPAGE');
  });
});
