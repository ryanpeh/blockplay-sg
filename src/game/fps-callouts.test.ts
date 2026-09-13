import { expect, it } from 'vitest';
import { createEncikRadio } from './fps-callouts';
import { createPlayerPilot, normalizePilotAction, type PilotObservation } from './fps-pilot';
it('throttles frame-rate events, prioritizes urgent calls and expires subtitles without a queue', () => {
  const radio = createEncikRadio(() => 0);
  expect(radio.emit('moving', 0)?.event).toBe('moving');
  expect(radio.emit('moving', 1)).toBeNull();
  expect(radio.emit('reload', 2)).toBeNull();
  expect(radio.emit('medical', 2)?.event).toBe('medical');
  expect(radio.emit('kill', 3)).toBeNull();
  expect(radio.current(7)?.event).toBe('medical');
  expect(radio.current(8)).toBeNull();
  expect(radio.emit('medical', 11)).toBeNull();
  expect(radio.emit('reload', 11)?.event).toBe('reload');
});
it('avoids consecutive repeats, and pause clears captions without resetting the spam cooldown', () => {
  const radio = createEncikRadio(() => 0), first = radio.emit('stuck', 0);
  expect(radio.emit('stuck', 23)?.text).not.toBe(first?.text);
  radio.clear(); expect(radio.current(24)).toBeNull(); expect(radio.emit('stuck', 24)).toBeNull();
  radio.reset(); expect(radio.emit('stuck', 25)).not.toBeNull();
});
it('allows escalating kill chains and death to interrupt routine radio traffic', () => {
  const radio = createEncikRadio(() => 0);
  radio.emit('reload', 0);
  expect(radio.emit('double', 1)?.event).toBe('double');
  expect(radio.emit('triple', 2)?.event).toBe('triple');
  expect(radio.emit('multi', 3)?.event).toBe('multi');
  expect(radio.emit('death', 3.1)?.event).toBe('death');
});
it('lets the pilot request observable contact and stuck callouts through bounded actions', () => {
  const o: PilotObservation = { time: 1, alive: true, health: 100, maxHealth: 100, armor: 0, magazine: 30, reserve: 120, weapon: 0, reloading: false, aiming: false, position: { x: 0, z: 0 }, yaw: 0, pitch: 0, contacts: [], waypoints: [], lootPrompt: '', travelPrompt: '' };
  expect(createPlayerPilot().decide({ ...o, contacts: [{ id: 'seen', yawError: 0, pitchError: 0, angularRadius: .1 }] }).action.callout).toBe('contact');
  const pilot = createPlayerPilot(); let action;
  for (let i = 0; i < 12; i++) action = pilot.decide({ ...o, time: 1 + i * .1 }).action;
  expect(action?.callout).toBe('stuck');
  expect(normalizePilotAction({ callout: 'invented enemy behind you' } as never).callout).toBeUndefined();
});
