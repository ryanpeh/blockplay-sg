# LAN arena and bot roles

Use Node 22.12+ and the project's pinned pnpm 11.22.0. No additional dependencies are needed; the existing two-week minimum release age remains enforced.

```sh
pnpm lan
```

This builds the app and starts the LAN server on port 4173. Open the URL it prints, then choose **LAN arena**. One player hosts; others open the same server URL and join with its room code or invitation link. Use the same network and keep the host's browser and terminal open. A VM may need bridged networking or port forwarding if its printed private address cannot be reached from other devices. Guest Wi-Fi client isolation and firewalls can prevent peer connections.

The Node server serves files and exchanges connection setup messages. Gameplay uses WebRTC data channels directly between browsers in a host-star arrangement, without external STUN/TURN services. There are up to four human players and six bots. This is intended for a trusted LAN; no host migration or Internet matchmaking is included. If the host leaves, guests should return to the lobby and create or join another room.

**Solo with bots** also works from `pnpm dev`; no signaling server is needed for solo. Host/join requires `pnpm lan`. Keep the host's tab visible for smooth simulation; background browser throttling can slow a match.

## Matches and loadouts

The infantry free-for-all ends at 15 kills or three minutes. Eliminated actors respawn after three seconds. Players use the weapons, attachments and armor currently equipped in the Armory. Change that equipment before entering a match. The host resolves equipment IDs against the local catalog and owns damage, bot decisions, scores and respawns. This prototype does not provide anti-cheat for local Armory ownership and does not award multiplayer currency or XP.

Choose a bot composition before launching:

| Composition | Equipment and behavior |
| --- | --- |
| Mixed | Cycles through all three built-in roles. |
| Assault | Rifle, light armor, closes distance and strafes. |
| Tank | Heavy infantry with 130 health, 100 armor and a 75-round support weapon; advances slowly and fires frequently. |
| Sniper | Light armor, six-round marksman tuning, longer sight range and slower accurate shots; holds distance and retreats when crowded. |

“Squad” selects the bot composition. This first mode is free-for-all: bots also fight one another. Team objectives and coordinated squad orders are future work. The sniper currently reuses the rifle model with distinct stats and behavior. Existing cars, helicopters and vehicle skins remain available in the practice mode; they are not synchronized in this infantry arena.

## Adding a role plugin

Roles are local TypeScript plugins in `src/game/arena-roles.ts`. A plugin combines a loadout with a `think(context)` function. Context includes target distance, visibility, remaining health fraction and strafe direction. The returned intent controls approach, strafe, firing, shot delay and spread. The authority handles movement collision, sight obstruction, aim, ammunition and damage.

```ts
import { registerArenaRole } from './arena-roles';

registerArenaRole({
  id: 'scout', name: 'Scout', description: 'Fast, lightly armored skirmisher.',
  health: 85, armor: 15, absorption: .25,
  speed: 4, sightRange: 60, reaction: .6, weaponIndex: 0,
  weapon: { damage: 28, interval: .15, capacity: 24, reload: 1.8 },
  think: ({ distance, visible, strafeDirection }) => ({
    approach: distance > 20 ? 1 : distance < 10 ? -1 : 0,
    strafe: strafeDirection, fire: visible, shotDelay: .5, spread: .06,
  }),
});
```

Import the plugin at startup before creating an arena, then pass its ID as `createArena`'s composition argument. Add a lobby option to expose it to players. Registration validates unique IDs and finite, bounded stats; plugins are shipped with the app, not downloaded or evaluated at runtime. Both peers should run the same build.

## Mouse capture

LAN HTTP startup supports browsers without `crypto.randomUUID`; session IDs fall back to `crypto.getRandomValues`. Test the actual LAN address, since localhost exposes secure-context APIs that a plain HTTP IP address does not. An HTTP 200 from curl alone does not verify that React starts.

Mouse FPS play uses standard relative pointer lock for VM compatibility. Actual pointer events select the input mode: only touch/pen can use unlocked drag-look. The CSS primary-pointer media query is no longer allowed to bypass capture, since a virtual tablet or touch laptop can still deliver mouse events. Switching from touch to mouse pauses for a fresh capture gesture. A frame guard also pauses mouse play if lock disappears without its normal browser event. The HUD shows MOUSE LOCKED or TOUCH LOOK beside health/armor. Raw input is not requested by default because some VM input devices accept capture but stop delivering movement. Mouse look consumes `movementX`/`movementY`, never absolute screen position; horizontal turning is unlimited. Escape pauses and releases capture.

If turning still stops at the **physical host screen edge** while the browser reports capture, check the VM/remote-desktop client's relative mouse or gaming capture setting. A web page cannot recenter the operating system cursor or recover movement that the VM never sends. The input implementation follows the browser's [raw pointer-lock API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock).

For UTM, try **Control + Option** in the focused VM window to toggle UTM input capture, then enter the game. This shortcut is separate from the game’s Escape key. See [UTM controls](https://docs.getutm.app/basics/controls/). If a macOS VM uses Apple Virtualization and capture is unavailable, opening the VM server URL in the host Mac’s browser avoids that input layer; see the [reported Apple Virtualization capture limitation](https://github.com/utmapp/UTM/issues/5176).

## Checks

```sh
pnpm test
pnpm build
pnpm test:lan
pnpm test:arena:lan
```

`test:lan` checks the signaling server and uses an isolated local Chrome for real WebRTC transport, including insecure HTTP, multiple guests and disconnects. It does not prove routing between separate physical devices. `test:arena:lan` launches two isolated Chrome processes and checks room joining, movement, native pointer capture, shooting, death/respawn, scores, rematches and host disconnect against the production build. `test:arena:solo` checks mixed squads and mobile layout with a running Vite server (default port 5175) and Chrome debugging on port 9228. Screenshots are saved under ignored `.cache/` folders. On this machine, the production build, all 127 unit tests, signaling tests, real three-peer transport test, two-client gameplay test, solo squad test, practice FPS test and relative-pointer test passed. Separate physical-device routing remains unverified.
