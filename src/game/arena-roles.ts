import { FPS_WEAPONS, type WeaponSpec } from './fps-rules';

export interface ArenaRoleContext { distance: number; visible: boolean; healthFraction: number; strafeDirection: number }
export interface ArenaRoleIntent { approach: number; strafe: number; fire: boolean; shotDelay: number; spread: number }
export interface ArenaRolePlugin {
  id: string; name: string; description: string; health: number; armor: number; absorption: number;
  speed: number; sightRange: number; reaction: number; weaponIndex: 0 | 1;
  weapon: Pick<WeaponSpec, 'damage' | 'interval' | 'capacity' | 'reload'>;
  think(context: Readonly<ArenaRoleContext>): ArenaRoleIntent;
}
const registry = new Map<string, ArenaRolePlugin>();
/** Local, statically imported extensions only: no downloaded scripts or eval. */
export function registerArenaRole(plugin: ArenaRolePlugin) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(plugin.id) || registry.has(plugin.id)) throw new Error('Role ID must be unique and use lowercase letters, numbers or hyphens.');
  if (!plugin.name || typeof plugin.think !== 'function' || ![plugin.health, plugin.armor, plugin.absorption, plugin.speed, plugin.sightRange, plugin.reaction,
    plugin.weapon.damage, plugin.weapon.interval, plugin.weapon.capacity, plugin.weapon.reload].every(Number.isFinite)) throw new Error('Role requires finite stats and a think function.');
  if (plugin.health <= 0 || plugin.health > 300 || plugin.armor < 0 || plugin.armor > 150 || plugin.absorption < 0 || plugin.absorption > 0.9 ||
    plugin.speed <= 0 || plugin.speed > 10 || plugin.sightRange <= 0 || plugin.sightRange > 125 || plugin.reaction < 0.1 || plugin.reaction > 10 ||
    ![0, 1].includes(plugin.weaponIndex) || plugin.weapon.damage <= 0 || plugin.weapon.damage > 100 || plugin.weapon.interval < 0.06 ||
    plugin.weapon.capacity < 1 || plugin.weapon.capacity > 200 || plugin.weapon.reload < 0.4) throw new Error('Role stats are outside arcade limits.');
  registry.set(plugin.id, Object.freeze({ ...plugin, weapon: Object.freeze({ ...plugin.weapon }) }));
}
export const getArenaRole = (id: string) => registry.get(id);
export const listArenaRoles = () => [...registry.values()];

registerArenaRole({
  id: 'assault', name: 'Assault squad', description: 'Mobile rifle bots that close distance and strafe around their target.',
  health: 100, armor: 25, absorption: 0.35, speed: 3.1, sightRange: 65, reaction: 0.65, weaponIndex: 0,
  weapon: { ...FPS_WEAPONS[0] },
  think: ({ distance, visible, strafeDirection }) => ({
    approach: !visible || distance > 18 ? 1 : distance < 8 ? -0.65 : 0,
    strafe: strafeDirection * (visible ? 0.85 : 0.35), fire: visible,
    shotDelay: 0.46, spread: 0.045,
  }),
});
registerArenaRole({
  id: 'tank', name: 'Tank squad', description: 'Heavy infantry: extra plates, slow advances and sustained support-weapon fire.',
  health: 130, armor: 100, absorption: 0.65, speed: 1.7, sightRange: 60, reaction: 0.85, weaponIndex: 1,
  weapon: { ...FPS_WEAPONS[1], damage: 27, capacity: 75 },
  think: ({ distance, visible, strafeDirection }) => ({
    approach: !visible || distance > 7 ? 1 : 0, strafe: visible ? strafeDirection * 0.18 : strafeDirection * 0.3,
    fire: visible, shotDelay: 0.28, spread: 0.075,
  }),
});
registerArenaRole({
  id: 'sniper', name: 'Sniper squad', description: 'Long-range marksmen that hold their ground and retreat when crowded.',
  health: 80, armor: 10, absorption: 0.25, speed: 2.3, sightRange: 110, reaction: 1.1, weaponIndex: 0,
  weapon: { ...FPS_WEAPONS[0], damage: 68, interval: 1.4, capacity: 6, reload: 2.5 },
  think: ({ distance, visible, strafeDirection }) => ({
    approach: !visible || distance > 52 ? 0.8 : distance < 27 ? -1 : 0,
    strafe: !visible ? strafeDirection * 0.25 : distance < 27 ? strafeDirection * 0.2 : 0,
    fire: visible, shotDelay: 1.55, spread: 0.012,
  }),
});

export const ARENA_ROLE_OPTIONS = [
  { id: 'mixed', name: 'Mixed squad', description: 'A mix of assault, heavy infantry and sniper bots.' },
  ...listArenaRoles().map(({ id, name, description }) => ({ id, name, description })),
];
