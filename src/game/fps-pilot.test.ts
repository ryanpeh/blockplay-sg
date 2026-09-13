import { describe, expect, it } from 'vitest';
import { createPlayerPilot, localPilotPlanner, MAX_PILOT_MOUSE_DELTA, normalizePilotAction, type PilotObservation } from './fps-pilot';
const observation = (patch: Partial<PilotObservation> = {}): PilotObservation => ({
  time: 1, alive: true, health: 100, maxHealth: 100, armor: 0, magazine: 30, reserve: 120, reloading: false, aiming: false, weapon: 0,
  position: { x: 0, z: 0 }, yaw: 0, pitch: 0, contacts: [], waypoints: [], lootPrompt: '', travelPrompt: '', ...patch,
});
describe('player pilot rules', () => {
  it('reacts to visible contacts, stops firing when they disappear, and reacquires with a delay', () => {
    const pilot = createPlayerPilot(), contact = { id: 'visible-1', yawError: 0, pitchError: 0, angularRadius: .02 };
    expect(pilot.decide(observation({ contacts: [contact] })).action.fire).toBe(false);
    expect(pilot.decide(observation({ time: 1.4, contacts: [contact] })).action.fire).toBe(true);
    expect(pilot.decide(observation({ time: 1.5 })).action.fire).toBe(false);
    expect(pilot.decide(observation({ time: 1.6, contacts: [contact] })).action.fire).toBe(false);
    expect(pilot.decide(observation({ alive: false })).action.fire).toBe(false);
  });
  it('reloads through a button intent without fabricating rounds', () => {
    const input = observation({ magazine: 0 }), before = structuredClone(input);
    expect(createPlayerPilot().decide(input).action.reload).toBe(true);
    expect(input).toEqual(before);
    expect(createPlayerPilot().decide(observation({ magazine: 0, reloading: true })).action.reload).toBe(false);
  });
  it('uses HUD waypoints for resupply and requires a checkpoint prompt for travel', () => {
    const waypoint = { id: 'exit', x: 0, z: -20, kind: 'checkpoint' as const };
    const travel = observation({ waypoints: [waypoint] });
    expect(localPilotPlanner.chooseGoal(travel)).toBe('travel');
    expect(createPlayerPilot().decide(travel).action).toMatchObject({ forward: true, travel: false });
    expect(createPlayerPilot().decide({ ...travel, travelPrompt: 'T · Travel' }).action.travel).toBe(true);
    expect(localPilotPlanner.chooseGoal(observation({ health: 20 }))).toBe('resupply');
  });
  it('bounds action deltas and strips unknown engine commands', () => {
    const action = normalizePilotAction({ lookX: Infinity, lookY: 5000, fire: true, teleport: { x: 100 }, health: 1000 } as never);
    expect(action.lookX).toBe(0); expect(action.lookY).toBe(MAX_PILOT_MOUSE_DELTA);
    expect(action).not.toHaveProperty('teleport'); expect(action).not.toHaveProperty('health');
  });
  it('resets target memory when control is handed back', () => {
    const pilot = createPlayerPilot(), input = observation({ contacts: [{ id: 'target', yawError: 0, pitchError: 0, angularRadius: .03 }] });
    pilot.decide(input); expect(pilot.decide({ ...input, time: 2 }).action.fire).toBe(true);
    pilot.reset(); expect(pilot.decide({ ...input, time: 3 }).action.fire).toBe(false);
  });
});

it('lines up before ADS and holds the sight through a brief transition without firing blindly', () => {
  const pilot = createPlayerPilot(), contact = { id: 'target', yawError: .2, pitchError: 0, angularRadius: .03 };
  expect(pilot.decide(observation({ contacts: [contact] })).action.aim).toBe(false);
  expect(pilot.decide(observation({ time: 1.1, contacts: [{ ...contact, yawError: 0 }] })).action.aim).toBe(true);
  expect(pilot.decide(observation({ time: 1.2, aiming: true })).action).toMatchObject({ aim: true, fire: false });
  expect(pilot.decide(observation({ time: 1.3, aiming: true, contacts: [{ ...contact, id: 'peripheral', yawError: .5 }] })).action).toMatchObject({ aim: true, fire: false, lookX: 0 });
  expect(pilot.decide(observation({ time: 1.8, aiming: true })).action.aim).toBe(false);
  expect(pilot.decide(observation({ time: 1.9, contacts: [{ ...contact, yawError: 0 }] })).action.aim).toBe(false);
  expect(pilot.decide(observation({ time: 2.4, contacts: [{ ...contact, yawError: 0 }] })).action).toMatchObject({ aim: false, fire: true });
});

it('walks past unusable medical supplies instead of repeatedly pressing pickup', () => {
  const input = observation({ lootPrompt: 'E · Medical supplies', waypoints: [{ id: 'medical', kind: 'medical', x: 1, z: 0 }] });
  expect(createPlayerPilot().decide(input).action.interact).toBe(false);
  expect(createPlayerPilot().decide({ ...input, health: 30 }).action.interact).toBe(true);
});
