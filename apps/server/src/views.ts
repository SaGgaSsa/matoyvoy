import type {
  BotDifficulty,
  Card,
  HandState,
  Player,
  PrivateHandView,
  PublicHandView,
  PublicMatchView,
  Room,
  Seat,
  Spectator,
} from '@matoyvoy/game-core';
import { Match } from '@matoyvoy/game-core';

export interface ServerPlayer extends Player {
  token: string;
  socketId: string | null;
}

export interface ServerSpectator extends Spectator {
  token: string;
  socketId: string | null;
}

export interface ServerRoom {
  code: string;
  name: string;
  hostId: string;
  players: ServerPlayer[];
  spectators: ServerSpectator[];
  status: Room['status'];
  targetScore: number;
  match: Match | null;
  createdAt: number;
  botDifficulty: BotDifficulty | null;
  /** Timer pendiente del driver del bot (nunca se expone al cliente). */
  botTimer?: NodeJS.Timeout | null;
}

export function publicRoomView(room: ServerRoom): Room {
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      team: p.team,
      connected: p.connected,
      isBot: p.isBot ?? false,
    })),
    spectators: room.spectators.map((s) => ({ id: s.id, name: s.name })),
    status: room.status,
    targetScore: room.targetScore,
    botDifficulty: room.botDifficulty,
  };
}

export function publicMatchView(room: ServerRoom): PublicMatchView | null {
  const m = room.match;
  if (!m) return null;
  return {
    scores: { ...m.state.scores },
    targetScore: m.state.config.targetScore,
    handNumber: m.state.handNumber,
    finished: m.state.finished,
    winnerTeam: m.state.winnerTeam,
  };
}

export function publicHandView(hand: HandState | null, viewer: Seat | null = null): PublicHandView | null {
  if (!hand) return null;
  const handCounts: Partial<Record<Seat, number>> = {};
  for (const [k, v] of Object.entries(hand.hands)) {
    handCounts[Number(k) as Seat] = (v as unknown[]).length;
  }
  // Cartas tapadas visibles solo para quien las jugo: el resto ve dorso.
  const hiddenIds = new Map<Seat, Set<string>>();
  for (const t of hand.tricks) {
    for (const p of t.plays) {
      if (p.faceDown && p.seat !== viewer) {
        if (!hiddenIds.has(p.seat)) hiddenIds.set(p.seat, new Set());
        hiddenIds.get(p.seat)!.add(p.card.id);
      }
    }
  }
  const mask = (seat: Seat, card: Card): Card =>
    hiddenIds.get(seat)?.has(card.id) ? HIDDEN_CARD : card;
  const played: Partial<Record<Seat, Card[]>> = {};
  for (const [k, v] of Object.entries(hand.played)) {
    const seat = Number(k) as Seat;
    played[seat] = (v as Card[]).map((c) => mask(seat, c));
  }
  return {
    id: hand.id,
    manoSeat: hand.manoSeat,
    tricks: hand.tricks.map((t) => ({
      ...t,
      plays: t.plays.map((p) => ({ ...p, card: mask(p.seat, p.card) })),
    })),
    currentTrickIndex: hand.currentTrickIndex,
    turnSeat: hand.turnSeat,
    truco: hand.truco,
    envido: hand.envido,
    finished: hand.finished,
    winnerSeat: hand.winnerSeat,
    winnerTeam: hand.winnerTeam,
    pointsAtStakeTruco: hand.pointsAtStakeTruco,
    played,
    handCounts,
    log: hand.log.slice(-30),
  };
}

// Dorso generico: la UI muestra reverso cuando el play tiene faceDown,
// asi que estos valores nunca se renderizan ni se usan en calculos.
const HIDDEN_CARD: Card = { id: 'tapada', rank: 4, suit: 'copa' };

export function privateHandView(
  hand: HandState | null,
  seat: Seat | null,
): PrivateHandView | null {
  const pub = publicHandView(hand);
  if (!pub || !hand) return pub as null;
  const myCards = seat !== null ? (hand.hands[seat] ?? []) : [];
  return { ...pub, myCards: [...myCards], mySeat: seat };
}
