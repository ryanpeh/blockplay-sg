export const MAX_LEVEL = 50;
export const ELIMINATION_XP = 25;
export const xpForLevel = (level: number) => { const n = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level))) - 1; return 100 * n * (n + 2); };
export function progression(xp: number) {
  const total = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1; while (level < MAX_LEVEL && total >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level), next = level === MAX_LEVEL ? floor : xpForLevel(level + 1);
  const rank = level < 3 ? 'Recruit' : level < 6 ? 'Operator' : level < 12 ? 'Specialist' : level < 20 ? 'Veteran' : level < 35 ? 'Elite' : 'Legend';
  return { level, rank, xp: total, floor, next, remaining: Math.max(0, next - total), progress: level === MAX_LEVEL ? 1 : (total - floor) / (next - floor) };
}
export const MULTIKILL_WINDOW = 3;
export interface KillChain { count: number; lastAt: number }
const CALLOUTS = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'MULTI KILL', 'ULTRA KILL', 'MONSTER KILL', 'UNSTOPPABLE', 'RAMPAGE'];
export function registerElimination(chain: KillChain, at: number) {
  const count = chain.count > 0 && at >= chain.lastAt && at - chain.lastAt <= MULTIKILL_WINDOW ? chain.count + 1 : 1;
  return { count, lastAt: at, label: CALLOUTS[Math.min(count, 8)] };
}
