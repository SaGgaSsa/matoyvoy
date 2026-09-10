// Tipos espejo del server (duplicados a proposito para no depender del build en dev).
// En monorepo final se importan de @matoyvoy/game-core via workspace.

export type Suit = 'espada' | 'basto' | 'oro' | 'copa';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;
export interface Card { id: string; rank: Rank; suit: Suit }
export type Seat = 0 | 1 | 2 | 3;
export type Team = 'A' | 'B';
export interface Player { id: string; name: string; seat: Seat; team: Team; connected: boolean; isBot: boolean }
export type BotDifficulty = 'facil' | 'medio' | 'dificil';
export interface Room {
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  spectators: { id: string; name: string }[];
  status: 'lobby' | 'playing' | 'finished';
  targetScore: number;
  botDifficulty: BotDifficulty | null;
}
export interface PublicMatchView {
  scores: Record<Team, number>;
  targetScore: number;
  handNumber: number;
  finished: boolean;
  winnerTeam: Team | null;
}
export interface TrickPlay { seat: Seat; card: Card }
export interface TrickResult {
  number: number;
  leadSeat: Seat;
  plays: TrickPlay[];
  winnerSeat: Seat | 'tie' | null;
}
export interface PrivateHandView {
  id: number;
  manoSeat: Seat;
  tricks: TrickResult[];
  currentTrickIndex: number;
  turnSeat: Seat | null;
  truco: any;
  envido: any;
  finished: boolean;
  winnerSeat: Seat | null;
  winnerTeam: Team | null;
  pointsAtStakeTruco: number;
  played: Partial<Record<Seat, Card[]>>;
  handCounts: Partial<Record<Seat, number>>;
  log: string[];
  myCards: Card[];
  mySeat: Seat | null;
}
export interface RoomStatePayload {
  room: Room;
  match: PublicMatchView | null;
  handPublic: any;
  hand: PrivateHandView | null;
  mySeat: Seat | null;
  myRole: string;
  myId: string;
  isHost: boolean;
  log: string[];
}
