import type { BotDifficulty, Card, EnvidoLevel, HandState, Seat } from './types.js';
import { trucoPower, effectivePower } from './ranking.js';
import { handEnvidoPoints } from './envido.js';
import { canSingEnvido, canSingTruco, rivalSeat } from './hand.js';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['facil', 'medio', 'dificil'];

export function randomBotDifficulty(rng: () => number = Math.random): BotDifficulty {
  return BOT_DIFFICULTIES[Math.floor(rng() * BOT_DIFFICULTIES.length)];
}

export type BotAction =
  | { type: 'play'; cardId: string }
  | { type: 'respondTruco'; quiero: boolean }
  | { type: 'respondEnvido'; quiero: boolean }
  | { type: 'singTruco' }
  | { type: 'singEnvido'; level: EnvidoLevel };

// El bot NUNCA juega tapada (v1): la tapada es un recurso del humano.

// --- Lecturas de fuerza (solo cartas propias) ---

function ownCards(hand: HandState, seat: Seat): Card[] {
  return hand.hands[seat] ?? [];
}

function originalCards(hand: HandState, seat: Seat): Card[] {
  return [...ownCards(hand, seat), ...(hand.played[seat] ?? [])];
}

function tanto(hand: HandState, seat: Seat): number {
  return handEnvidoPoints(originalCards(hand, seat));
}

function sortedByPower(cards: Card[]): { card: Card; power: number }[] {
  return cards
    .map((card) => ({ card, power: trucoPower(card) }))
    .sort((a, b) => a.power - b.power);
}

function strongCount(hand: HandState, seat: Seat): number {
  return originalCards(hand, seat).filter((c) => trucoPower(c) >= 10).length;
}

function maxPower(hand: HandState, seat: Seat): number {
  return originalCards(hand, seat).reduce((m, c) => Math.max(m, trucoPower(c)), 0);
}

function tricksWon(hand: HandState, seat: Seat): number {
  return hand.tricks.filter((t) => t.winnerSeat === seat).length;
}

// --- Respuestas ---

function respondEnvido(hand: HandState, seat: Seat, difficulty: BotDifficulty): BotAction {
  const t = tanto(hand, seat);
  const threshold = difficulty === 'facil' ? 30 : difficulty === 'medio' ? 27 : 25;
  return { type: 'respondEnvido', quiero: t >= threshold };
}

function respondTruco(hand: HandState, seat: Seat, difficulty: BotDifficulty): BotAction {
  const max = maxPower(hand, seat);
  const t = tanto(hand, seat);
  if (difficulty === 'facil') return { type: 'respondTruco', quiero: max >= 12 };
  const medioQuiere = max >= 10 || (max >= 8 && t >= 25);
  if (difficulty === 'medio') return { type: 'respondTruco', quiero: medioQuiere };
  const quiero = medioQuiere || (tricksWon(hand, seat) >= 1 && max >= 7);
  return { type: 'respondTruco', quiero };
}

// --- Cantos (solo en turno propio, sin pendientes) ---

function maybeSing(hand: HandState, seat: Seat, difficulty: BotDifficulty): BotAction | null {
  if (difficulty === 'facil') return null;
  const t = tanto(hand, seat);
  if (canSingEnvido(hand, seat)) {
    const threshold = difficulty === 'medio' ? 28 : 26;
    if (t >= threshold) {
      const high = difficulty === 'medio' ? 31 : 30;
      return { type: 'singEnvido', level: t >= high ? 'real_envido' : 'envido' };
    }
  }
  if (canSingTruco(hand, seat)) {
    const fuertes = strongCount(hand, seat);
    if (difficulty === 'medio') {
      if (hand.truco.level === 'none' && fuertes >= 2) return { type: 'singTruco' };
    } else {
      const won = tricksWon(hand, seat);
      if (hand.truco.level === 'none' ? fuertes >= 2 || (won >= 1 && fuertes >= 1) : fuertes >= 2) {
        return { type: 'singTruco' };
      }
    }
  }
  return null;
}

// --- Juego de carta ---

function chooseCard(hand: HandState, seat: Seat, difficulty: BotDifficulty, rng: () => number): Card | null {
  const mine = ownCards(hand, seat);
  if (mine.length === 0) return null;
  if (difficulty === 'facil') {
    return mine[Math.floor(rng() * mine.length)]!;
  }
  const sorted = sortedByPower(mine);
  const trick = hand.tricks[hand.currentTrickIndex];
  const rivalBest = (trick?.plays ?? [])
    .filter((p) => p.seat !== seat)
    .reduce((m, p) => Math.max(m, effectivePower(p)), -2);
  const hasRivalPlay = (trick?.plays ?? []).some((p) => p.seat !== seat);
  if (hasRivalPlay) {
    const winners = sorted.filter((s) => s.power > rivalBest);
    if (winners.length > 0) return winners[0]!.card; // gana barato
    return sorted[0]!.card; // no llega: guarda y juega la menor
  }
  return sorted[0]!.card; // sale: guarda las bravas
}

// --- Entrada principal ---

export function decideBotAction(
  hand: HandState | null,
  seat: Seat,
  difficulty: BotDifficulty = 'medio',
  rng: () => number = Math.random,
): BotAction | null {
  if (!hand || hand.finished) return null;
  if (hand.truco.pending && hand.truco.pendingTo === seat) {
    return respondTruco(hand, seat, difficulty);
  }
  if (hand.envido.pending && hand.envido.pendingTo === seat) {
    return respondEnvido(hand, seat, difficulty);
  }
  if (hand.turnSeat !== seat) return null;
  if (hand.truco.pending || hand.envido.pending) return null;
  const sing = maybeSing(hand, seat, difficulty);
  if (sing) return sing;
  const card = chooseCard(hand, seat, difficulty, rng);
  if (!card) return null;
  return { type: 'play', cardId: card.id };
}
