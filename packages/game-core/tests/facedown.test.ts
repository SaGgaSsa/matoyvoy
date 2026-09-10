import { describe, test, expect } from 'vitest';
import { makeCard } from '../src/cards.js';
import { createHand, playCard } from '../src/hand.js';
import { handEnvidoPoints } from '../src/envido.js';

function hand13() {
  return createHand({
    id: 1,
    manoSeat: 0,
    dealerSeat: 1,
    seats: [0, 1],
    handsOverride: {
      0: [makeCard(4, 'copa'), makeCard(5, 'oro'), makeCard(6, 'basto')],
      1: [makeCard(1, 'espada'), makeCard(5, 'copa'), makeCard(6, 'oro')],
    },
  });
}

describe('carta tapada', () => {
  test('la mejor carta tapada pierde contra cualquier visible', () => {
    const h = hand13();
    playCard(h, 0, '4-copa'); // visible, poder 1
    playCard(h, 1, '1-espada', { faceDown: true }); // tapada, poder real 14
    expect(h.tricks[0]!.winnerSeat).toBe(0);
  });

  test('dos tapadas empatan', () => {
    const h = hand13();
    playCard(h, 0, '4-copa', { faceDown: true });
    playCard(h, 1, '1-espada', { faceDown: true });
    expect(h.tricks[0]!.winnerSeat).toBe('tie');
  });

  test('la tapada sale de la mano y queda marcada', () => {
    const h = hand13();
    playCard(h, 0, '4-copa', { faceDown: true });
    expect(h.hands[0]).toHaveLength(2);
    expect(h.tricks[0]!.plays[0]).toMatchObject({ seat: 0, faceDown: true });
    expect(h.tricks[0]!.plays[0]!.card.id).toBe('4-copa');
  });

  test('el log no revela la carta tapada', () => {
    const h = hand13();
    playCard(h, 0, '4-copa', { faceDown: true });
    const last = h.log[h.log.length - 1]!;
    expect(last).toContain('tapada');
    expect(last).not.toContain('4-copa');
  });

  test('la tapada cuenta igual para el tanto', () => {
    const h = hand13();
    playCard(h, 0, '4-copa', { faceDown: true });
    const tanto = handEnvidoPoints([...(h.hands[0] ?? []), ...(h.played[0] ?? [])]);
    // 4c+5o+6b sin par: la mas alta = 6
    expect(tanto).toBe(6);
  });
});
