import { ARMORY_CATALOG, issuedItems, itemById, type AttachmentSlot, type ShopItem } from './armory-catalog';
import type { VehicleKind } from './vehicle-rules';
import { progression, ELIMINATION_XP } from './progression';
import { FPS_WEAPONS, type WeaponSpec } from './fps-rules';
export interface GunEquipment { variant: string; skin: string; attachments: Partial<Record<AttachmentSlot, string>> }
export interface ArmoryProfile { version: 1; xp: number; vehicleSkins: Record<VehicleKind, string>; credits: number; tokens: number; owned: string[]; guns: [GunEquipment, GunEquipment]; rig: string; plate: string; rewarded: string[]; exercises: number }
export const STORAGE_KEY = 'blockplay.armory.v1';
export function createProfile(): ArmoryProfile { return { version: 1, xp: 0, vehicleSkins: { car: 'paint-issued', helicopter: 'paint-issued' }, credits: 1600, tokens: 300, owned: [...issuedItems], guns: [{ variant: 'sar-issued', skin: 'skin-issued', attachments: {} }, { variant: 'ult-issued', skin: 'skin-issued', attachments: {} }], rig: 'rig-ilbv', plate: 'plate-none', rewarded: [], exercises: 0 }; }
const finiteBalance = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1000000, Math.floor(n))) : fallback;
export function restoreProfile(raw: string | null): ArmoryProfile {
  const base = createProfile(); if (!raw) return base;
  try {
    const value = JSON.parse(raw); if (!value || value.version !== 1) return base;
    base.xp = finiteBalance(value.xp, 0);
    base.credits = finiteBalance(value.credits, base.credits); base.tokens = finiteBalance(value.tokens, base.tokens);
    base.owned = [...new Set([...issuedItems, ...(Array.isArray(value.owned) ? value.owned.filter((id: unknown) => typeof id === 'string' && !!itemById(id)) : [])])] as string[];
    const valid = (id: unknown, category: string) => typeof id === 'string' && base.owned.includes(id) && itemById(id)?.category === category;
    for (const i of [0, 1] as const) {
      const gun = value.guns?.[i]; if (!gun) continue;
      if (valid(gun.variant, 'weapon') && itemById(gun.variant)?.family === i) base.guns[i].variant = gun.variant;
      if (valid(gun.skin, 'skin')) base.guns[i].skin = gun.skin;
      for (const slot of ['optic', 'magazine', 'handling'] as const) {
        const id = gun.attachments?.[slot]; if (valid(id, 'attachment') && itemById(id)?.slot === slot) base.guns[i].attachments[slot] = id;
      }
    }
    for (const kind of ['car', 'helicopter'] as const) if (valid(value.vehicleSkins?.[kind], 'vehicleSkin')) base.vehicleSkins[kind] = value.vehicleSkins[kind];
    if (valid(value.rig, 'rig')) base.rig = value.rig;
    if (valid(value.plate, 'plate')) base.plate = value.plate;
    base.rewarded = Array.isArray(value.rewarded) ? value.rewarded.filter((id: unknown) => typeof id === 'string').slice(-100) : [];
    base.exercises = finiteBalance(value.exercises, 0); return base;
  } catch { return base; }
}
export function purchase(profile: ArmoryProfile, id: string) {
  const item = itemById(id);
  if (!item) return { profile, message: 'Item unavailable.' };
  if (profile.owned.includes(id)) return { profile, message: 'Already owned. Equip it below.' };
  if (progression(profile.xp).level < (item.requiredLevel || 1)) return { profile, message: `Unlocks at level ${item.requiredLevel}. Earn XP in the range.` };
  if (profile[item.currency] < item.price) return { profile, message: `Not enough ${item.currency}.` };
  return { profile: { ...profile, [item.currency]: profile[item.currency] - item.price, owned: [...profile.owned, id] }, message: `${item.name} unlocked permanently.` };
}
export function equip(profile: ArmoryProfile, id: string, family: number, vehicle: VehicleKind = 'car'): ArmoryProfile {
  const item = itemById(id); if (!item || !profile.owned.includes(id) || (family !== 0 && family !== 1)) return profile;
  if (item.category === 'vehicleSkin') return { ...profile, vehicleSkins: { ...profile.vehicleSkins, [vehicle]: id } };
  if (item.category === 'rig' || item.category === 'plate') return { ...profile, [item.category]: id };
  if (item.category === 'weapon' && item.family !== family) return profile;
  const gun: GunEquipment = { ...profile.guns[family], attachments: { ...profile.guns[family].attachments } };
  if (item.category === 'weapon') gun.variant = id;
  if (item.category === 'skin') gun.skin = id;
  if (item.category === 'attachment' && item.slot) gun.attachments[item.slot] = id;
  const guns: ArmoryProfile['guns'] = [...profile.guns]; guns[family] = gun; return { ...profile, guns };
}
export function unequipAttachment(profile: ArmoryProfile, family: number, slot: AttachmentSlot): ArmoryProfile {
  if (family !== 0 && family !== 1) return profile;
  const gun = { ...profile.guns[family], attachments: { ...profile.guns[family].attachments } }; delete gun.attachments[slot];
  const guns: ArmoryProfile['guns'] = [...profile.guns]; guns[family] = gun; return { ...profile, guns };
}
export function isEquipped(profile: ArmoryProfile, item: ShopItem, family: number, vehicle: VehicleKind = 'car') {
  const gun = profile.guns[family];
  return item.category === 'vehicleSkin' ? profile.vehicleSkins[vehicle] === item.id : item.category === 'rig' ? profile.rig === item.id : item.category === 'plate' ? profile.plate === item.id : item.category === 'weapon' ? gun.variant === item.id : item.category === 'skin' ? gun.skin === item.id : !!item.slot && gun.attachments[item.slot] === item.id;
}
export interface EquippedWeapon extends WeaponSpec { equipment: GunEquipment; accent?: string }
export interface ResolvedLoadout { weapons: EquippedWeapon[]; armor: number; absorption: number; mobility: number; rigName: string; plateName: string; vehicleSkins: Record<VehicleKind, string> }
export function resolveLoadout(profile: ArmoryProfile): ResolvedLoadout {
  const rig = itemById(profile.rig)!, plate = itemById(profile.plate)!;
  const weapons = profile.guns.map((gun, i) => {
    const variant = itemById(gun.variant)!;
    const spec: EquippedWeapon = { ...FPS_WEAPONS[i], ...variant.stats, name: variant.name, equipment: gun, accent: variant.accent, reserve: FPS_WEAPONS[i].reserve + (rig.carry || 0) };
    for (const id of Object.values(gun.attachments)) {
      const attachment = itemById(id);
      if (attachment?.slot === 'optic' && attachment.stats?.optic) spec.optic = attachment.stats.optic;
      const mod = attachment?.modifiers; if (!mod) continue;
      spec.capacity += mod.capacity || 0; spec.reload *= mod.reload || 1; spec.recoil *= mod.recoil || 1; spec.mobility *= mod.mobility || 1;
      if (mod.aimFov) spec.aimFov = mod.aimFov;
    }
    return spec;
  });
  return { weapons, vehicleSkins: { ...profile.vehicleSkins }, armor: plate.protection || 0, absorption: plate.absorption || 0, mobility: (rig.mobility || 1) * (plate.mobility || 1), rigName: rig.name, plateName: plate.name };
}
/** Preview may temporarily own the selected item; it never mutates the actual wallet. */
export function previewLoadout(profile: ArmoryProfile, item: ShopItem, family: number) {
  return resolveLoadout(equip({ ...profile, owned: [...profile.owned, item.id] }, item.id, family));
}
export function applyArmorDamage(health: number, armor: number, amount: number, absorption: number) {
  const incoming = Math.max(0, amount), blocked = Math.min(Math.max(0, armor), incoming * Math.max(0, Math.min(1, absorption)));
  return { health: Math.max(0, health - (incoming - blocked)), armor: Math.max(0, armor - blocked), blocked };
}
export interface ExerciseReward { id: string; hits: number; shots: number; landed: number; elapsed: number; combat: boolean }
export function rewardAmount(result: ExerciseReward) {
  const accuracy = Math.min(1, result.landed / Math.max(1, result.shots));
  return 250 + Math.round(accuracy * 100) + Math.max(0, 100 - Math.floor(result.elapsed)) + (result.combat ? 100 : 0);
}
export function completionXp(result: ExerciseReward) { return 200 + Math.round(Math.min(1, result.landed / Math.max(1, result.shots)) * 100) + (result.combat ? 100 : 0); }
export function claimElimination(profile: ArmoryProfile, id: string): ArmoryProfile {
  if (!id || profile.rewarded.includes(id)) return profile;
  return { ...profile, xp: Math.min(1000000, profile.xp + ELIMINATION_XP), rewarded: [...profile.rewarded, id].slice(-100) };
}
export function claimReward(profile: ArmoryProfile, result: ExerciseReward): ArmoryProfile {
  if (result.hits !== 8 || result.shots < 8 || !Number.isFinite(result.shots) || !Number.isFinite(result.landed) || result.landed < 8 || result.landed > result.shots || !Number.isFinite(result.elapsed) || result.elapsed < 0 || !result.id || profile.rewarded.includes(result.id)) return profile;
  return { ...profile, xp: Math.min(1000000, profile.xp + completionXp(result)), credits: Math.min(1000000, profile.credits + rewardAmount(result)), rewarded: [...profile.rewarded, result.id].slice(-100), exercises: profile.exercises + 1 };
}
export const SHOP_CATEGORIES = [
  { id: 'weapon', label: 'Weapons' }, { id: 'skin', label: 'Skins' }, { id: 'attachment', label: 'Attachments' }, { id: 'armor', label: 'Armor' }, { id: 'vehicleSkin', label: 'Vehicles' },
] as const;
export const catalogSize = ARMORY_CATALOG.length;
