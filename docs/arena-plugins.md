# Arena bot roles

The LAN host owns damage, armor, ammunition, movement limits, eliminations, respawns and the match clock. Guests send input and aim over WebRTC. Solo bot matches run the same authority locally. Matches last three minutes or end at 15 eliminations; respawns take three seconds. Bot count is capped at six for the VM.

Built-in compositions are `mixed`, `assault`, `tank`, and `sniper`. “Tank” means heavy infantry in this mode. All health, protection and weapon values are fictional arcade balancing.

| Role | Behavior | Equipment |
| --- | --- | --- |
| Assault | Closes to medium range, strafes and seeks another angle around cover | Rifle, light plates |
| Tank | Advances aggressively, moves slowly and fires frequent support bursts | Support weapon, heavy plates, extra health |
| Sniper | Holds long sight lines, retreats when crowded and fires slowly with tighter spread | High-damage marksman rifle, small magazine, light protection |

## Add a local plugin

Register a statically imported role before creating the match. The host is the only machine that runs its `think` function. Guests receive the resulting actor positions and role IDs, so guests do not need to execute the plugin.

```ts
import { getArenaRole, registerArenaRole } from '../src/game/arena-roles';

registerArenaRole({
  ...getArenaRole('assault')!,
  id: 'defender',
  name: 'Defender squad',
  description: 'Holds position and fires at visible opponents.',
  think: ({ visible }) => ({
    approach: 0,
    strafe: 0,
    fire: visible,
    shotDelay: 0.8,
    spread: 0.04,
  }),
});

// createArena(obstacles, 4, 'defender')
```

The context supplies target distance, line of sight, health fraction and a changing strafe direction. An intent supplies normalized approach/retreat and strafe weights, permission to fire, a delay between shots, and angular spread. Movement remains constrained by scene collision; damage remains constrained by the authority's ray tests and weapon cooldowns. The role also declares health, armor, movement speed, sight range, reaction delay and weapon stats.

Role IDs are unique, stats are validated, and intent movement is clamped. `listArenaRoles()` returns the live registry for a custom composition picker. `ARENA_ROLE_OPTIONS` supplies the built-in lobby options. This extension point loads application code through imports; it does not download or evaluate third-party scripts.

Run `pnpm exec vitest run src/game/arena-rules.test.ts` to check authority rules, bot movement and role behavior.
