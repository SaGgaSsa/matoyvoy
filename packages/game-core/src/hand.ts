import { dealHands, shuffle, createDeck } from './cards.js';
import { trickWinner, resolveHandWinner } from './ranking.js';
import { handEnvidoPoints, envidoPointsForLevel } from './envido.js';
import type {
  Card,
  HandState,
  Seat,
  Team,
  TrickResult,
  TrucoLevel,
  EnvidoLevel,
  teamOfSeat as _teamOfSeat,
} from './types.js';
import { teamOfSeat } from './types.js';

export interface CreateHandOpts {
  id: number;
  manoSeat: Seat;
  dealerSeat: Seat;
  seats: Seat[];
  deck?: Card[];
  rng?: () => number;
  handsOverride?: Partial<Record<Seat, Card[]>>; // para tests
}

export function createHand(opts: CreateHandOpts): HandState {
  const { id, manoSeat, dealerSeat, seats } = opts;
  let hands: Partial<Record<Seat, Card[]>>;
  if (opts.handsOverride) {
    hands = { ...opts.handsOverride };
  } else {
    const deck = opts.deck ?? shuffle(createDeck(), opts.rng ?? Math.random);
    const dealt = dealHands(deck, seats as number[], 3);
    hands = {};
    for (const s of seats) hands[s] = dealt[s] as Card[];
  }
  const played: Partial<Record<Seat, Card[]>> = {};
  for (const s of seats) played[s] = [];

  const tricks: TrickResult[] = [
    { number: 0, leadSeat: manoSeat, plays: [], winnerSeat: null },
  ];

  return {
    id,
    manoSeat,
    dealerSeat,
    hands,
    played,
    tricks,
    currentTrickIndex: 0,
    turnSeat: manoSeat,
    truco: {
      level: 'none',
      pending: false,
      pendingBy: null,
      pendingTo: null,
      wanted: false,
      lastCaller: null,
      history: [],
      turnBefore: null,
    },
    envido: {
      level: 'none',
      pending: false,
      pendingBy: null,
      pendingTo: null,
      done: false,
      winnerSeat: null,
      pointsWon: 0,
      callerHistory: [],
      turnBefore: null,
    },
    finished: false,
    winnerSeat: null,
    winnerTeam: null,
    pointsAtStakeTruco: 1,
    log: [`Mano ${id}: sale ${manoSeat}`],
  };
}

export function activeSeats(hand: HandState): Seat[] {
  return (Object.keys(hand.hands) as unknown as Seat[])
    .map((s) => Number(s) as Seat)
    .sort();
}

export function rivalSeat(hand: HandState, seat: Seat): Seat {
  const seats = activeSeats(hand);
  if (seats.length === 2) return seats.find((s) => s !== seat)!;
  // 2v2 futuro: siguiente asiento rival en orden circular
  const order = [0, 1, 2, 3] as Seat[];
  let idx = order.indexOf(seat);
  for (let k = 1; k <= 4; k++) {
    const cand = order[(idx + k) % 4]!;
    if ((cand as number) !== (seat as number) && seats.includes(cand)) {
      if (teamOfSeat(cand) !== teamOfSeat(seat)) return cand;
    }
  }
  return seats.find((s) => s !== seat)!;
}

function currentTrick(hand: HandState): TrickResult {
  return hand.tricks[hand.currentTrickIndex]!;
}

function allCardsOfSeat(hand: HandState, seat: Seat): Card[] {
  const rest = hand.hands[seat] ?? [];
  const done = hand.played[seat] ?? [];
  return [...rest, ...done];
}

export function trucoRejectedPoints(level: TrucoLevel): number {
  if (level === 'truco') return 1;
  if (level === 'retruco') return 2;
  if (level === 'vale_cuatro') return 3;
  return 1;
}

export function trucoWantedPoints(level: TrucoLevel): number {
  if (level === 'truco') return 2;
  if (level === 'retruco') return 3;
  if (level === 'vale_cuatro') return 4;
  return 1;
}

// ---------- Jugadas ----------

export function playCard(hand: HandState, seat: Seat, cardId: string): HandState {
  if (hand.finished) throw new Error('La mano ya termino');
  if (hand.truco.pending || hand.envido.pending)
    throw new Error('Hay un canto pendiente de respuesta');
  if (hand.turnSeat !== seat) throw new Error(`No es el turno de ${seat}`);

  const cards = hand.hands[seat];
  if (!cards) throw new Error(`Asiento ${seat} no participa`);
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error('Carta no esta en tu mano');
  const [card] = cards.splice(idx, 1);

  const trick = currentTrick(hand);
  trick.plays.push({ seat, card: card! });
  hand.played[seat]!.push(card!);
  hand.log.push(`Juega ${seat}: ${card!.id}`);

  const seats = activeSeats(hand);
  if (trick.plays.length >= seats.length) {
    // Baza completa
    const w = trickWinner(trick.plays);
    trick.winnerSeat = w;
    hand.log.push(
      w === 'tie' ? `Baza ${trick.number} parda` : `Baza ${trick.number} gana ${w}`,
    );

    // Ver si la mano se define
    const decided = tryFinishByTricks(hand);
    if (decided) return hand;

    // Siguiente baza
    const nextIndex = hand.currentTrickIndex + 1;
    if (nextIndex > 2) {
      // No deberia pasar porque tryFinishByTricks habria cerrado
      finishHand(hand, hand.manoSeat);
      return hand;
    }
    const lead: Seat = w === 'tie' ? trick.leadSeat : (w as Seat);
    hand.currentTrickIndex = nextIndex;
    hand.tricks.push({ number: nextIndex, leadSeat: lead, plays: [], winnerSeat: null });
    hand.turnSeat = lead;
  } else {
    // Siguiente turno dentro de la baza: el otro asiento (1v1) o rotacion
    const next = nextTurnInTrick(hand, seat);
    hand.turnSeat = next;
  }
  return hand;
}

function nextTurnInTrick(hand: HandState, justPlayed: Seat): Seat {
  const trick = currentTrick(hand);
  const seats = activeSeats(hand);
  // Orden de juego: lead primero, luego en orden de asientos activos circular
  // Para 1v1 es simplemente el que no jugo aun.
  for (const s of seats) {
    if (!trick.plays.some((p) => p.seat === s)) return s;
  }
  return justPlayed;
}

function tryFinishByTricks(hand: HandState): boolean {
  const n = hand.tricks.length;
  // Con 2 bazas ya puede definirse en varios casos
  if (n === 2) {
    const w0 = hand.tricks[0]!.winnerSeat;
    const w1 = hand.tricks[1]!.winnerSeat;
    if (w0 !== null && w1 !== null) {
      if (w0 !== 'tie' && w0 === w1) {
        finishHand(hand, w0 as Seat);
        return true;
      }
      if (w0 === 'tie' && w1 !== 'tie') {
        finishHand(hand, w1 as Seat);
        return true;
      }
      if (w1 === 'tie' && w0 !== 'tie') {
        finishHand(hand, w0 as Seat);
        return true;
      }
    }
    return false;
  }
  if (n === 3) {
    const w = resolveHandWinner(hand.tricks, hand.manoSeat);
    if (w !== 'tie') {
      finishHand(hand, w as Seat);
      return true;
    }
    // triple parda u otro caso: gana mano
    finishHand(hand, hand.manoSeat);
    return true;
  }
  return false;
}

function finishHand(hand: HandState, winnerSeat: Seat): void {
  hand.finished = true;
  hand.winnerSeat = winnerSeat;
  hand.winnerTeam = teamOfSeat(winnerSeat);
  hand.turnSeat = null;
  // pointsAtStakeTruco ya refleja truco querido, o 1 por defecto.
  // Si la mano termino por No Quiero de truco, el caller ya seteo finished y puntos.
  hand.log.push(`Mano gana ${winnerSeat} (equipo ${hand.winnerTeam}) por ${hand.pointsAtStakeTruco} pts`);
}

// ---------- Truco ----------

const TRUCO_ORDER: TrucoLevel[] = ['none', 'truco', 'retruco', 'vale_cuatro'];

export function canSingTruco(hand: HandState, seat: Seat): boolean {
  if (hand.finished) return false;
  if (hand.truco.pending || hand.envido.pending) return false;
  if (!activeSeats(hand).includes(seat)) return false;
  const cur = hand.truco.level;
  if (cur === 'vale_cuatro') return false;
  if (cur === 'none') {
    // MVP simplificado pero fiel: cualquiera puede cantar en cualquier momento (como en truco real).
    return true;
  }
  // Solo se puede subir si el nivel actual fue querido y yo no fui el ultimo que canto
  if (!hand.truco.wanted) return false;
  if (hand.truco.lastCaller === seat) return false;
  return true;
}

export function nextTrucoLevel(hand: HandState): TrucoLevel {
  const idx = TRUCO_ORDER.indexOf(hand.truco.level);
  return TRUCO_ORDER[idx + 1] as TrucoLevel;
}

export function singTruco(hand: HandState, seat: Seat, level?: TrucoLevel): HandState {
  const want = level ?? nextTrucoLevel(hand);
  if (!canSingTruco(hand, seat)) throw new Error('No podes cantar truco ahora');
  // Validar progresion
  const expected = nextTrucoLevel(hand);
  if (want !== expected) throw new Error(`Nivel de truco invalido: esperaba ${expected}`);
  hand.truco.turnBefore = hand.turnSeat;
  hand.truco.level = want;
  hand.truco.pending = true;
  hand.truco.pendingBy = seat;
  hand.truco.pendingTo = rivalSeat(hand, seat);
  hand.truco.wanted = false;
  hand.truco.lastCaller = seat;
  hand.truco.history.push(want);
  hand.turnSeat = null; // pausa hasta respuesta
  hand.log.push(`${seat} canta ${want}`);
  return hand;
}

export function respondTruco(hand: HandState, seat: Seat, quiero: boolean): HandState {
  if (!hand.truco.pending) throw new Error('No hay truco pendiente');
  if (hand.truco.pendingTo !== seat) throw new Error('No te toca responder el truco');
  const level = hand.truco.level;
  const caller = hand.truco.pendingBy!;
  if (!quiero) {
    // Rechazo: mano termina, caller gana puntos del nivel rechazado
    hand.truco.pending = false;
    hand.pointsAtStakeTruco = trucoRejectedPoints(level);
    hand.finished = true;
    hand.winnerSeat = caller;
    hand.winnerTeam = teamOfSeat(caller);
    hand.turnSeat = null;
    hand.log.push(`${seat} no quiere ${level}: ${caller} suma ${hand.pointsAtStakeTruco}`);
    return hand;
  }
  hand.truco.pending = false;
  hand.truco.wanted = true;
  hand.pointsAtStakeTruco = trucoWantedPoints(level);
  // Vuelve el turno a quien lo tenia antes del canto
  hand.turnSeat = hand.truco.turnBefore ?? caller;
  hand.truco.turnBefore = null;
  hand.truco.pendingBy = null;
  hand.truco.pendingTo = null;
  hand.log.push(`${seat} quiere ${level}: se juega por ${hand.pointsAtStakeTruco}`);
  return hand;
}

// ---------- Envido ----------

export function canSingEnvido(hand: HandState, seat: Seat): boolean {
  if (hand.finished) return false;
  if (hand.envido.done) return false;
  if (hand.truco.pending || hand.envido.pending) return false;
  if (!activeSeats(hand).includes(seat)) return false;
  // Solo en primera baza (MVP). Cualquiera puede cantar (como en truco real).
  if (hand.currentTrickIndex !== 0) return false;
  if (hand.truco.level !== 'none') return false; // simplificacion: no mezclar con truco cantado
  return true;
}

export function singEnvido(
  hand: HandState,
  seat: Seat,
  level: EnvidoLevel = 'envido',
): HandState {
  if (level === 'none') throw new Error('Nivel de envido invalido');
  if (!canSingEnvido(hand, seat)) throw new Error('No podes cantar envido ahora');
  // MVP: un solo canto por mano
  if (hand.envido.level !== 'none') throw new Error('En este MVP solo un canto de envido por mano');
  hand.envido.turnBefore = hand.turnSeat;
  hand.envido.level = level;
  hand.envido.pending = true;
  hand.envido.pendingBy = seat;
  hand.envido.pendingTo = rivalSeat(hand, seat);
  hand.envido.callerHistory.push(level);
  hand.turnSeat = null;
  hand.log.push(`${seat} canta ${level}`);
  return hand;
}

export function respondEnvido(
  hand: HandState,
  seat: Seat,
  quiero: boolean,
  maxScore: number,
  targetScore: number,
): HandState {
  if (!hand.envido.pending) throw new Error('No hay envido pendiente');
  if (hand.envido.pendingTo !== seat) throw new Error('No te toca responder el envido');
  const level = hand.envido.level;
  const caller = hand.envido.pendingBy!;
  hand.envido.pending = false;
  hand.envido.done = true;
  hand.envido.pendingBy = null;
  hand.envido.pendingTo = null;
  if (!quiero) {
    // 1 punto al cantor (lo asigna el Match via pointsWon/winnerSeat)
    hand.envido.winnerSeat = caller;
    hand.envido.pointsWon = 1;
    hand.log.push(`${seat} no quiere ${level}: ${caller} suma 1`);
  } else {
    const a = handEnvidoPoints(allCardsOfSeat(hand, caller));
    const b = handEnvidoPoints(allCardsOfSeat(hand, seat));
    let winner: Seat;
    if (a > b) winner = caller;
    else if (b > a) winner = seat;
    else winner = hand.manoSeat; // empate -> mano
    const pts =
      level === 'falta_envido'
        ? envidoPointsForLevel('falta_envido', maxScore, targetScore)
        : envidoPointsForLevel(level as 'envido' | 'real_envido', maxScore, targetScore);
    hand.envido.winnerSeat = winner;
    hand.envido.pointsWon = pts;
    hand.log.push(
      `${seat} quiere ${level}: ${caller}=${a} vs ${seat}=${b}, gana ${winner} ${pts} pts`,
    );
  }
  // Vuelve el turno a quien lo tenia antes del canto
  hand.turnSeat = hand.envido.turnBefore ?? caller;
  hand.envido.turnBefore = null;
  return hand;
}
