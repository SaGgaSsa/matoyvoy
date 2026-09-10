// Tipos base compartidos. game-core no depende de sockets ni UI.

export type Suit = 'espada' | 'basto' | 'oro' | 'copa';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  id: string; // ej "1-espada"
  rank: Rank;
  suit: Suit;
}

export type Seat = 0 | 1 | 2 | 3;
export type Team = 'A' | 'B';

export function teamOfSeat(seat: Seat): Team {
  return seat === 0 || seat === 2 ? 'A' : 'B';
}

export interface Player {
  id: string;
  name: string;
  seat: Seat;
  team: Team;
  connected: boolean;
}

export type TrucoLevel = 'none' | 'truco' | 'retruco' | 'vale_cuatro';
export type EnvidoLevel = 'none' | 'envido' | 'real_envido' | 'falta_envido';

export interface TrickPlay {
  seat: Seat;
  card: Card;
}

export interface TrickResult {
  number: number; // 0,1,2
  leadSeat: Seat;
  plays: TrickPlay[];
  winnerSeat: Seat | 'tie' | null; // null si incompleta
}

export interface TrucoState {
  level: TrucoLevel;
  pending: boolean; // esperando respuesta
  pendingBy: Seat | null; // quien canto
  pendingTo: Seat | null; // quien debe responder (en 1v1 es el rival)
  wanted: boolean; // si el nivel actual fue querido
  lastCaller: Seat | null;
  history: TrucoLevel[];
  turnBefore: Seat | null;
}

export interface EnvidoState {
  level: EnvidoLevel;
  pending: boolean;
  pendingBy: Seat | null;
  pendingTo: Seat | null;
  done: boolean; // ya se resolvio (querido o no) en esta mano
  winnerSeat: Seat | null;
  pointsWon: number;
  callerHistory: EnvidoLevel[];
  turnBefore: Seat | null;
}

export interface HandState {
  id: number;
  manoSeat: Seat;
  dealerSeat: Seat;
  // cartas en mano por asiento (privadas)
  hands: Partial<Record<Seat, Card[]>>;
  // cartas ya jugadas por asiento (publicas, en orden)
  played: Partial<Record<Seat, Card[]>>;
  tricks: TrickResult[];
  currentTrickIndex: number;
  turnSeat: Seat | null; // null si esperando respuesta de canto o mano terminada
  truco: TrucoState;
  envido: EnvidoState;
  finished: boolean;
  winnerSeat: Seat | null; // ganador de la mano (para truco/1pto)
  winnerTeam: Team | null;
  pointsAtStakeTruco: number; // 1 por defecto, 2/3/4 si querido
  log: string[];
}

export interface MatchConfig {
  targetScore: number; // 15 por defecto
  players: Player[]; // 2 para 1v1, 4 para 2v2 futuro
}

export interface MatchState {
  config: MatchConfig;
  scores: Record<Team, number>;
  handNumber: number;
  currentHand: HandState | null;
  finished: boolean;
  winnerTeam: Team | null;
  log: string[];
}

// ---- Room (lo maneja el server, pero los tipos viven aca para compartir con web) ----

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface Spectator {
  id: string;
  name: string;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  spectators: Spectator[];
  status: RoomStatus;
  targetScore: number;
}

// Vista publica (para espectadores y rivales): sin cartas privadas ajenas
export interface PublicHandView {
  id: number;
  manoSeat: Seat;
  tricks: TrickResult[];
  currentTrickIndex: number;
  turnSeat: Seat | null;
  truco: TrucoState;
  envido: EnvidoState;
  finished: boolean;
  winnerSeat: Seat | null;
  winnerTeam: Team | null;
  pointsAtStakeTruco: number;
  played: Partial<Record<Seat, Card[]>>;
  // conteo de cartas en mano por asiento (sin revelar cuales)
  handCounts: Partial<Record<Seat, number>>;
  log: string[];
}

// Vista privada: publica + mis cartas
export interface PrivateHandView extends PublicHandView {
  myCards: Card[];
  mySeat: Seat | null;
}

export interface PublicMatchView {
  scores: Record<Team, number>;
  targetScore: number;
  handNumber: number;
  finished: boolean;
  winnerTeam: Team | null;
}
