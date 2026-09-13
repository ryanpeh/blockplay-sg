/** Fictional Encik radio lines. Shared by human events and player-pilot intents. */
export const ENCIK_LINES = {
  start: ['Alright, fall in! Eyes open, we move.', 'Stand by, ah. Weapon ready, brain also ready.', 'Listen in! Move together, come back together.'],
  contact: ['Contact front! Eyes open, don’t blur!', 'Got contact! Steady your aim, don’t kancheong.', 'Oi, front! This one not sightseeing tour!'],
  reload: ['Changing mag! Cover first, hero later.', 'Reloading, ah! Nobody say can take tea break.', 'Fresh mag going in. Steady, don’t fumble.'],
  lowAmmo: ['Ammo running low! Every round counts, ah.', 'Check your ammo! This one not unlimited buffet.', 'Rounds low already. Go find supplies.'],
  hurt: ['Find cover lah! You think your ILBV is magic?', 'Move, move! Don’t stand there like Merlion!', 'Taking fire! This one not the time to admire scenery.'],
  medical: ['Health low! Find medical supplies, don’t act hero.', 'You want to book out or not? Get patched up!', 'Wounded already! Cover first, then sort yourself out.'],
  kill: ['One down. Good shot, carry on!', 'Solid lah! Eyes up, still got work.', 'That one settled. Don’t anyhow celebrate yet.'],
  double: ['Double kill! Wah, today you on form ah!', 'Two down! Can lah, keep it steady.', 'Two already! Good grouping, soldier!'],
  triple: ['Triple kill! Encik saw that. Not bad, ah!', 'Three down! Steady lah, don’t get cocky.', 'Three already! This one got standard!'],
  multi: ['Wah, whole lot! Leave some for your section lah!', 'You clearing the whole parade square or what?', 'Solid work! Keep your head, don’t anyhow rush.'],
  pickup: ['Supplies secured. Check your kit, then move.', 'Got resupply! Take what you need, not shopping spree.', 'Good, gear sorted. Don’t leave anything behind, ah.'],
  moving: ['Move out! This one tactical movement, not route march.', 'Keep moving, ah. Don’t grow roots here.', 'Next bound! Eyes up, weapon ready.'],
  stuck: ['Eh, wall in front. Go around lah.', 'You fighting the enemy or fighting the wall?', 'Stuck again? Reverse, turn, try another way!'],
  death: ['Aiyoh. Next life, use the cover properly.', 'Down already. Learn from it, come back stronger.', 'Never mind. Regroup, then do properly.'],
  respawn: ['Back already? Good. This time, use your brain.', 'Fall in again! Same mission, better execution.', 'Another chance. Steady, don’t repeat the same stunt.'],
  complete: ['Exercise cut! Check clear, then we talk about book out.', 'End of exercise! Good effort, whole lot of you.', 'All targets down. Can lah! Now check your kit.'],
} as const;
export type EncikEvent = keyof typeof ENCIK_LINES;
export interface EncikCallout { id: number; event: EncikEvent; text: string; until: number; priority: number }
const priority = (event: EncikEvent) => event === 'death' ? 7 : event === 'medical' ? 6 : ['multi', 'complete'].includes(event) ? 5 : event === 'triple' ? 4 : event === 'double' ? 3 : ['contact', 'hurt', 'kill'].includes(event) ? 2 : 1;
export function createEncikRadio(random = Math.random) {
  let active: EncikCallout | null = null, lastAt = -Infinity, sequence = 0;
  const heard = new Map<EncikEvent, number>(), previous = new Map<EncikEvent, number>();
  return {
    emit(event: EncikEvent, now: number): EncikCallout | null {
      const rank = priority(event), cooldown = ['double', 'triple', 'multi', 'kill'].includes(event) ? 6 : 22;
      if (now - (heard.get(event) ?? -Infinity) < cooldown) return null;
      if (now - lastAt < 8 && !(active && rank > active.priority && (event === 'death' || now - lastAt >= .8))) return null;
      const lines = ENCIK_LINES[event];
      let index = Math.min(lines.length - 1, Math.max(0, Math.floor(random() * lines.length)));
      if (index === previous.get(event)) index = (index + 1) % lines.length;
      active = { id: ++sequence, event, text: lines[index], until: now + 6, priority: rank };
      heard.set(event, now); previous.set(event, index); lastAt = now;
      return active;
    },
    current(now: number) { return active && now < active.until ? active : null; },
    clear() { active = null; },
    reset() { active = null; lastAt = -Infinity; heard.clear(); previous.clear(); },
  };
}
