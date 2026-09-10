import { describe, test, expect } from 'vitest';
import { makeCard } from '../src/cards.js';
import { createHand, playCard, singTruco, respondTruco, singEnvido, respondEnvido } from '../src/hand.js';
import { Match } from '../src/match.js';

function hand12() {
  // seat0 fuerte, seat1 flojo
  return createHand({
    id: 1,
    manoSeat: 0,
    dealerSeat: 1,
    seats: [0, 1],
    handsOverride: {
      0: [makeCard(1, 'espada'), makeCard(3, 'oro'), makeCard(3, 'copa')],
      1: [makeCard(4, 'oro'), makeCard(5, 'copa'), makeCard(6, 'basto')],
    },
  });
}

describe('turnos y bazas', () => {
  test('mano sale primero', () => {
    const h = hand12();
    expect(h.turnSeat).toBe(0);
  });
  test('jugar fuera de turno falla', () => {
    const h = hand12();
    expect(() => playCard(h, 1, '4-oro')).toThrow();
  });
  test('ganador de baza lidera la siguiente', () => {
    const h = hand12();
    playCard(h, 0, '1-espada');
    playCard(h, 1, '4-oro');
    expect(h.tricks[0]!.winnerSeat).toBe(0);
    expect(h.turnSeat).toBe(0);
    expect(h.currentTrickIndex).toBe(1);
  });
  test('mano completa: gana el fuerte y cierra en 2 bazas', () => {
    const h = hand12();
    playCard(h, 0, '1-espada');
    playCard(h, 1, '4-oro');
    playCard(h, 0, '3-oro');
    playCard(h, 1, '5-copa');
    expect(h.finished).toBe(true);
    expect(h.winnerSeat).toBe(0);
  });
});

describe('puntos de truco', () => {
  test('sin canto se juega por 1', () => {
    const h = hand12();
    expect(h.pointsAtStakeTruco).toBe(1);
  });
  test('truco querido = 2', () => {
    const h = hand12();
    singTruco(h, 0);
    expect(h.truco.pending).toBe(true);
    respondTruco(h, 1, true);
    expect(h.pointsAtStakeTruco).toBe(2);
    expect(h.turnSeat).toBe(0);
  });
  test('truco no querido = 1 al cantor y cierra mano', () => {
    const h = hand12();
    singTruco(h, 0);
    respondTruco(h, 1, false);
    expect(h.finished).toBe(true);
    expect(h.winnerSeat).toBe(0);
    expect(h.pointsAtStakeTruco).toBe(1);
  });
  test('retruco querido = 3, vale cuatro = 4', () => {
    const h = hand12();
    singTruco(h, 0); // truco
    respondTruco(h, 1, true);
    singTruco(h, 1); // retruco (sube el rival)
    respondTruco(h, 0, true);
    expect(h.pointsAtStakeTruco).toBe(3);
    singTruco(h, 0); // vale cuatro
    respondTruco(h, 1, true);
    expect(h.pointsAtStakeTruco).toBe(4);
  });
  test('retruco no querido = 2', () => {
    const h = hand12();
    singTruco(h, 0);
    respondTruco(h, 1, true);
    singTruco(h, 1);
    respondTruco(h, 0, false);
    expect(h.finished).toBe(true);
    expect(h.winnerSeat).toBe(1);
    expect(h.pointsAtStakeTruco).toBe(2);
  });
});

describe('envido aceptacion y puntajes', () => {
  test('envido querido otorga 2 al mejor tanto', () => {
    const h = createHand({
      id: 1, manoSeat: 0, dealerSeat: 1, seats: [0, 1],
      handsOverride: {
        0: [makeCard(7, 'oro'), makeCard(6, 'oro'), makeCard(4, 'copa')], // 33
        1: [makeCard(4, 'oro'), makeCard(5, 'copa'), makeCard(6, 'basto')], // bajo
      },
    });
    singEnvido(h, 0, 'envido');
    respondEnvido(h, 1, true, 0, 15);
    expect(h.envido.done).toBe(true);
    expect(h.envido.winnerSeat).toBe(0);
    expect(h.envido.pointsWon).toBe(2);
  });
  test('envido no querido = 1 al cantor', () => {
    const h = hand12();
    singEnvido(h, 0, 'envido');
    respondEnvido(h, 1, false, 0, 15);
    expect(h.envido.winnerSeat).toBe(0);
    expect(h.envido.pointsWon).toBe(1);
  });
  test('real envido = 3, falta = lo que falta', () => {
    const h = hand12();
    singEnvido(h, 0, 'real_envido');
    respondEnvido(h, 1, true, 0, 15);
    expect(h.envido.pointsWon).toBe(3);
  });
  test('empate de tanto gana la mano', () => {
    const h = createHand({
      id: 1, manoSeat: 1, dealerSeat: 0, seats: [0, 1],
      handsOverride: {
        0: [makeCard(7, 'oro'), makeCard(4, 'copa'), makeCard(5, 'basto')], // 7
        1: [makeCard(7, 'copa'), makeCard(4, 'oro'), makeCard(5, 'espada')], // 7
      },
    });
    // mano es 1, canta 0
    singEnvido(h, 0, 'envido');
    respondEnvido(h, 1, true, 0, 15);
    expect(h.envido.winnerSeat).toBe(1);
  });
});

describe('match: cambio de mano y puntaje', () => {
  test('sortea la mano con el rng y suma puntos hasta 15', () => {
    const m = new Match({
      targetScore: 15,
      players: [
        { id: 'a', name: 'A', seat: 0, team: 'A', connected: true },
        { id: 'b', name: 'B', seat: 1, team: 'B', connected: true },
      ],
    });
    const h1 = m.startNextHand(() => 0);
    expect(h1.manoSeat).toBe(0);
    // cerrar a mano: forzar ganador
    h1.finished = true; h1.winnerSeat = 0; h1.winnerTeam = 'A'; h1.pointsAtStakeTruco = 1;
    (h1 as any).__trucoApplied = false;
    m.applyClosedHand();
    expect(m.state.scores.A).toBe(1);
    const h2 = m.startNextHand(() => 0.99);
    expect(h2.manoSeat).toBe(1);
  });
});
