import type {
  BotDifficulty,
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

export function publicHandView(hand: HandState | null): PublicHandView | null {
  if (!hand) return null;
  const handCounts: Partial<Record<Seat, number>> = {};
  for (const [k, v] of Object.entries(hand.hands)) {
    handCounts[Number(k) as Seat] = (v as unknown[]).length;
  }
  return {
    id: hand.id,
    manoSeat: hand.manoSeat,
    tricks: hand.tricks,
    currentTrickIndex: hand.currentTrickIndex,
    turnSeat: hand.turnSeat,
    truco: hand.truco,
    envido: hand.envido,
    finished: hand.finished,
    winnerSeat: hand.winnerSeat,
    winnerTeam: hand.winnerTeam,
    pointsAtStakeTruco: hand.pointsAtStakeTruco,
    played: hand.played,
    handCounts,
    log: hand.log.slice(-30),
  };
}

export function privateHandView(
  hand: HandState | null,
  seat: Seat | null,
): PrivateHandView | null {
  const pub = publicHandView(hand);
  if (!pub || !hand) return pub as null;
  const myCards = seat !== null ? (hand.hands[seat] ?? []) : [];
  return { ...pub, myCards: [...myCards], mySeat: seat };
}
