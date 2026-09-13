import { ARMORY_CATALOG, itemById, type ShopItem } from './armory-catalog';
import { resolveLoadout, type ArmoryProfile, type GunEquipment } from './armory-state';
import type { Obstacle } from './marina-collision';
import type { WorldZoneId, ZonePosition } from './world-zones';

export type FieldLootKind = 'weapon' | 'ammo' | 'medical' | 'armor';
export interface FieldLoot {
  id: string; zoneId: WorldZoneId; kind: FieldLootKind; catalogId?: string;
  name: string; tier: ShopItem['tier']; x: number; z: number; amount: number;
}
export interface LootZoneGeometry {
  id: WorldZoneId; spawn: ZonePosition;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  obstacles: readonly Obstacle[]; anchors?: readonly ZonePosition[];
}
export interface ZoneLootRules {
  eliteChance: number; fieldChance: number; weaponCount: number; ammoCount: number;
  medicalCount: number; armorCount: number; ammoAmount: number; medicalAmount: number;
}
/** Tier probabilities apply to each weapon crate, independently. CBD means Raffles Place. */
export const ZONE_LOOT_RULES: Readonly<Record<WorldZoneId, Readonly<ZoneLootRules>>> = {
  queenstown: { eliteChance: 0.05, fieldChance: 0.3, weaponCount: 2, ammoCount: 2, medicalCount: 1, armorCount: 1, ammoAmount: 45, medicalAmount: 25 },
  'marina-bay': { eliteChance: 0.15, fieldChance: 0.55, weaponCount: 3, ammoCount: 2, medicalCount: 2, armorCount: 1, ammoAmount: 60, medicalAmount: 40 },
  'raffles-place': { eliteChance: 0.5, fieldChance: 0.4, weaponCount: 4, ammoCount: 3, medicalCount: 1, armorCount: 2, ammoAmount: 90, medicalAmount: 60 },
};
const finitePosition = (p: ZonePosition) => Number.isFinite(p.x) && Number.isFinite(p.z);
const hash = (text: string) => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
};
function randomFor(seed: string) {
  let value = hash(seed);
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function clearGround(point: ZonePosition, geometry: LootZoneGeometry, radius = 0.65) {
  if (!finitePosition(point)) return false;
  const b = geometry.bounds;
  if (point.x - radius < b.minX || point.x + radius > b.maxX || point.z - radius < b.minZ || point.z + radius > b.maxZ) return false;
  return !geometry.obstacles.some(o => point.x + radius > o.minX && point.x - radius < o.maxX && point.z + radius > o.minZ && point.z - radius < o.maxZ);
}
function choose<T>(items: readonly T[], random: () => number): T { return items[Math.floor(random() * items.length)]; }
export function rollZoneWeapon(zoneId: WorldZoneId, random: () => number): ShopItem {
  const rules = ZONE_LOOT_RULES[zoneId];
  const roll = random();
  const tier: ShopItem['tier'] = roll < rules.eliteChance ? 'Elite' : roll < rules.eliteChance + rules.fieldChance ? 'Field' : 'Issued';
  return choose(ARMORY_CATALOG.filter(item => item.category === 'weapon' && item.tier === tier && (item.family === 0 || item.family === 1)), random);
}

/** One instance belongs to one expedition. Re-entry returns cached crates, never new rolls. */
export function createExpeditionLoot(seed: string | number) {
  const seedText = String(seed); const zones = new Map<WorldZoneId, FieldLoot[]>(); const collected = new Set<string>();
  function enterZone(geometry: LootZoneGeometry): FieldLoot[] {
    if (zones.has(geometry.id)) return remaining(geometry.id);
    if (!ZONE_LOOT_RULES[geometry.id] || !finitePosition(geometry.spawn) || !Object.values(geometry.bounds).every(Number.isFinite) ||
      geometry.bounds.minX >= geometry.bounds.maxX || geometry.bounds.minZ >= geometry.bounds.maxZ) return [];
    // Content and positions have separate streams: adding cover cannot change which gear was rolled.
    const random = randomFor(`${seedText}:${geometry.id}:contents`);
    const positionRandom = randomFor(`${seedText}:${geometry.id}:positions`);
    const rules = ZONE_LOOT_RULES[geometry.id];
    const kinds: FieldLootKind[] = [
      ...Array<FieldLootKind>(rules.weaponCount).fill('weapon'), ...Array<FieldLootKind>(rules.ammoCount).fill('ammo'),
      ...Array<FieldLootKind>(rules.medicalCount).fill('medical'), ...Array<FieldLootKind>(rules.armorCount).fill('armor'),
    ];
    const points: ZonePosition[] = [];
    const candidates = (geometry.anchors ?? []).filter(p => clearGround(p, geometry)).map(p => ({ ...p }));
    // Fisher-Yates keeps curated safe anchors random without moving them into scenery.
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(positionRandom() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    function accept(point: ZonePosition) {
      if (!clearGround(point, geometry) || points.some(p => Math.hypot(p.x - point.x, p.z - point.z) < 3)) return false;
      points.push(point); return true;
    }
    for (const candidate of candidates) { if (points.length >= kinds.length) break; accept(candidate); }
    for (let attempt = 0; points.length < kinds.length && attempt < 1000; attempt++) {
      const angle = positionRandom() * Math.PI * 2; const distance = 15 + positionRandom() * 30;
      accept({ x: Math.round((geometry.spawn.x + Math.cos(angle) * distance) * 100) / 100, z: Math.round((geometry.spawn.z + Math.sin(angle) * distance) * 100) / 100 });
    }
    const loot: FieldLoot[] = points.map((point, index) => {
      const kind = kinds[index];
      const common = { id: `loot-${hash(seedText).toString(36)}-${geometry.id}-${index}`, zoneId: geometry.id, kind, ...point };
      if (kind === 'weapon') {
        const item = rollZoneWeapon(geometry.id, random);
        return { ...common, catalogId: item.id, name: item.name, tier: item.tier, amount: 1 };
      }
      if (kind === 'armor') {
        const elite = random() < rules.eliteChance;
        const item = itemById(elite ? 'plate-elite' : random() < 0.55 ? 'plate-soft' : 'plate-ceramic')!;
        return { ...common, catalogId: item.id, name: item.name, tier: item.tier, amount: 1 };
      }
      if (kind === 'ammo') return { ...common, name: 'Ammunition pack', tier: 'Issued', amount: rules.ammoAmount };
      return { ...common, name: 'Medical supplies', tier: 'Field', amount: rules.medicalAmount };
    });
    zones.set(geometry.id, loot);
    return remaining(geometry.id);
  }
  function remaining(zoneId: WorldZoneId): FieldLoot[] { return (zones.get(zoneId) ?? []).filter(item => !collected.has(item.id)).map(item => ({ ...item })); }
  function nearest(zoneId: WorldZoneId, player: ZonePosition, radius = 2.8): FieldLoot | null {
    if (!finitePosition(player) || !Number.isFinite(radius) || radius <= 0) return null;
    return remaining(zoneId).filter(item => Math.hypot(item.x - player.x, item.z - player.z) <= Math.min(radius, 2.8))
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0] ?? null;
  }
  function collect(zoneId: WorldZoneId, lootId: string, player: ZonePosition): FieldLoot | null {
    if (!finitePosition(player)) return null;
    const item = (zones.get(zoneId) ?? []).find(candidate => candidate.id === lootId);
    if (!item || collected.has(item.id) || Math.hypot(item.x - player.x, item.z - player.z) > 2.8) return null;
    collected.add(item.id); return { ...item };
  }
  function snapshot() {
    return { seed: seedText, zones: [...zones.entries()].map(([id, loot]) => ({ id, loot: loot.map(item => ({ ...item })) })), collected: [...collected] };
  }
  return { enterZone, remaining, nearest, collect, snapshot };
}
export type ExpeditionLoot = ReturnType<typeof createExpeditionLoot>;

export interface FieldEquipment { weapons: Partial<Record<0 | 1, string>>; plate?: string }
export const createFieldEquipment = (): FieldEquipment => ({ weapons: {} });
/** Gear found in the field never modifies owned items, currencies or shop unlocks. */
export function equipFieldLoot(equipment: FieldEquipment, loot: FieldLoot): FieldEquipment {
  const item = loot.catalogId ? itemById(loot.catalogId) : undefined;
  if (loot.kind === 'weapon' && item?.category === 'weapon' && (item.family === 0 || item.family === 1)) {
    return { ...equipment, weapons: { ...equipment.weapons, [item.family]: item.id } };
  }
  if (loot.kind === 'armor' && item?.category === 'plate' && (item.protection ?? 0) > 0) return { ...equipment, weapons: { ...equipment.weapons }, plate: item.id };
  return equipment;
}
export function resolveExpeditionLoadout(profile: ArmoryProfile, equipment: FieldEquipment) {
  const guns = profile.guns.map((gun, family) => {
    const item = itemById(equipment.weapons[family as 0 | 1] ?? '');
    return { ...gun, attachments: { ...gun.attachments }, ...(item?.category === 'weapon' && item.family === family ? { variant: item.id } : {}) };
  }) as [GunEquipment, GunEquipment];
  const plate = itemById(equipment.plate ?? '');
  return resolveLoadout({ ...profile, guns, plate: plate?.category === 'plate' ? plate.id : profile.plate });
}
