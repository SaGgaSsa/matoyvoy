import type { Card } from './types.js';

// Valor de una carta para el envido: figuras valen 0, resto su numero.
export function envidoCardValue(card: Card): number {
  if (card.rank >= 10) return 0;
  return card.rank;
}

// Tanto de una mano de 3 cartas (o menos).
export function handEnvidoPoints(cards: Card[]): number {
  if (cards.length === 0) return 0;
  if (cards.length === 1) return envidoCardValue(cards[0]!);
  let best = 0;
  // Mejor par del mismo palo
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]!;
      const b = cards[j]!;
      if (a.suit === b.suit) {
        const v = 20 + envidoCardValue(a) + envidoCardValue(b);
        if (v > best) best = v;
      }
    }
  }
  if (best > 0) return best;
  // Sin par: la mas alta
  for (const c of cards) best = Math.max(best, envidoCardValue(c));
  return best;
}

// Puntos en juego segun nivel cantado (version MVP: un solo canto por mano).
// Documentado: Envido=2, Real=3, Falta=lo que falta para ganar.
export function envidoPointsForLevel(
  level: 'envido' | 'real_envido' | 'falta_envido',
  maxScore: number,
  targetScore: number,
): number {
  if (level === 'envido') return 2;
  if (level === 'real_envido') return 3;
  // Falta Envido: los puntos que le faltan al que va primero para cerrar.
  return Math.max(1, targetScore - maxScore);
}

// Puntos al rechazar (No Quiero): siempre 1 en MVP de un solo canto.
export function envidoNoQuieroPoints(): number {
  return 1;
}
