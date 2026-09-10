import type { Card, Rank, Suit } from './types.js';

export const SUITS: Suit[] = ['espada', 'basto', 'oro', 'copa'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

// Fisher-Yates. Acepta rng inyectable para tests.
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealHands(deck: Card[], seats: number[], cardsPerHand = 3): Record<number, Card[]> {
  const out: Record<number, Card[]> = {};
  let idx = 0;
  for (const s of seats) out[s] = [];
  for (let r = 0; r < cardsPerHand; r++) {
    for (const s of seats) {
      const c = deck[idx++];
      if (!c) throw new Error('Mazo insuficiente para repartir');
      out[s].push(c);
    }
  }
  return out;
}
