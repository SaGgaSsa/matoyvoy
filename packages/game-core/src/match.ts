import { createHand, activeSeats } from './hand.js';
import type { Card, HandState, MatchConfig, MatchState, Player, Seat, Team } from './types.js';
import { teamOfSeat } from './types.js';
import { shuffle, createDeck } from './cards.js';

export class Match {
  state: MatchState;

  constructor(config: MatchConfig) {
    if (config.players.length !== 2 && config.players.length !== 4) {
      throw new Error('MVP soporta 2 jugadores (1v1); modelo preparado para 4 (2v2)');
    }
    this.state = {
      config: { ...config },
      scores: { A: 0, B: 0 },
      handNumber: 0,
      currentHand: null,
      finished: false,
      winnerTeam: null,
      log: [],
    };
  }

  get seats(): Seat[] {
    return this.state.config.players.map((p) => p.seat).sort() as Seat[];
  }

  seatOfPlayer(playerId: string): Seat | null {
    const p = this.state.config.players.find((x) => x.id === playerId);
    return p ? p.seat : null;
  }

  startNextHand(rng: () => number = Math.random, deck?: Card[]): HandState {
    if (this.state.finished) throw new Error('La partida ya termino');
    // Aplicar puntos pendientes de la mano anterior ya deberia estar hecho via applyClosedHand.
    const n = this.state.handNumber + 1;
    const seats = this.seats;
    // Alternar mano: mano = seats[(n-1) % len]
    const manoSeat = seats[(n - 1) % seats.length] as Seat;
    // Dealer = anterior (para 1v1, el otro)
    const dealerSeat = seats[n % seats.length] as Seat;
    const hand = createHand({
      id: n,
      manoSeat,
      dealerSeat,
      seats,
      rng,
      deck: deck ?? shuffle(createDeck(), rng),
    });
    this.state.handNumber = n;
    this.state.currentHand = hand;
    this.state.log.push(`Mano ${n}: mano=${manoSeat}`);
    return hand;
  }

  // Suma puntos de envido ya resuelto (llamar tras respondEnvido con quiero/no).
  applyEnvidoPoints(): number {
    const h = this.requireHand();
    if (!h.envido.done || h.envido.winnerSeat === null) return 0;
    // Evitar doble aplicacion: marcamos con un flag en log? Usamos campo pointsWon y lo consumimos una vez.
    // Guardamos applied en el propio hand via propiedad dinamica.
    const handAny = h as HandState & { __envidoApplied?: boolean };
    if (handAny.__envidoApplied) return 0;
    handAny.__envidoApplied = true;
    const team = teamOfSeat(h.envido.winnerSeat);
    this.state.scores[team] += h.envido.pointsWon;
    this.state.log.push(`Envido: ${team} +${h.envido.pointsWon}`);
    this.checkWin();
    return h.envido.pointsWon;
  }

  // Cierra la mano terminada y suma puntos de truco/1pto. Retorna puntos sumados.
  applyClosedHand(): { team: Team; points: number } | null {
    const h = this.requireHand();
    if (!h.finished || h.winnerTeam === null) return null;
    const handAny = h as HandState & { __trucoApplied?: boolean };
    if (handAny.__trucoApplied) return null;
    handAny.__trucoApplied = true;
    const pts = h.pointsAtStakeTruco;
    this.state.scores[h.winnerTeam] += pts;
    this.state.log.push(`Mano ${h.id}: ${h.winnerTeam} +${pts}`);
    this.checkWin();
    return { team: h.winnerTeam, points: pts };
  }

  private checkWin(): void {
    const t = this.state.config.targetScore;
    for (const team of ['A', 'B'] as Team[]) {
      if (this.state.scores[team] >= t && !this.state.finished) {
        this.state.finished = true;
        this.state.winnerTeam = team;
        this.state.log.push(`Gana equipo ${team}`);
      }
    }
  }

  private requireHand(): HandState {
    const h = this.state.currentHand;
    if (!h) throw new Error('No hay mano en curso');
    return h;
  }
}

export function maxScore(scores: Record<Team, number>): number {
  return Math.max(scores.A, scores.B);
}
