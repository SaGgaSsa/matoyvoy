import { describe, test, expect } from 'vitest';
import { Match } from '../src/match.js';

function players() {
  return [
    { id: 'a', name: 'A', seat: 0 as const, team: 'A' as const, connected: true },
    { id: 'b', name: 'B', seat: 1 as const, team: 'B' as const, connected: true },
  ];
}

describe('match: mano sorteada', () => {
  test('rng 0 -> mano es el primer asiento', () => {
    const m = new Match({ targetScore: 15, players: players() });
    const h = m.startNextHand(() => 0);
    expect(h.manoSeat).toBe(0);
  });

  test('rng 0.99 -> mano es el ultimo asiento', () => {
    const m = new Match({ targetScore: 15, players: players() });
    const h = m.startNextHand(() => 0.99);
    expect(h.manoSeat).toBe(1);
  });

  test('cada mano reparte 3 cartas por jugador', () => {
    const m = new Match({ targetScore: 15, players: players() });
    const h = m.startNextHand(() => 0.3);
    expect(h.hands[0]).toHaveLength(3);
    expect(h.hands[1]).toHaveLength(3);
  });
});
