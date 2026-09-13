import { describe, expect, it } from 'vitest';
import { cleanLanName, cleanRoomCode, createSoloSession } from './lan-peer';

describe('LAN identity boundary', () => {
  it('normalizes short room codes and removes control characters from player names', () => {
    expect(cleanRoomCode('  a12bc3 ')).toBe('A12BC3');
    expect(cleanLanName('  Player\u0000\nOne ')).toBe('PlayerOne');
    expect(cleanLanName(' '.repeat(25))).toBe('Recruit');
    expect(cleanLanName('x'.repeat(60))).toHaveLength(20);
  });
  it('allows an offline bot session without browser networking globals', () => {
    const session = createSoloSession(' Pilot ');
    expect(session.name).toBe('Pilot');
    expect(session.role).toBe('solo');
    expect(session.getPeers()).toEqual([]);
    expect(createSoloSession('Pilot').id).not.toBe(session.id);
    session.send({ type: 'state' });
    session.close();
    session.close();
  });
});
