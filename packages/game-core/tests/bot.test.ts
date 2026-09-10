import { describe, test, expect } from 'vitest';
import { BOT_DIFFICULTIES, randomBotDifficulty, decideBotAction } from '../src/bot.js';
import type { BotAction } from '../src/bot.js';
import { makeCard } from '../src/cards.js';
import { createHand, playCard, singTruco } from '../src/hand.js';
import type { Card, Seat } from '../src/types.js';

describe('bot: estructura de niveles', () => {
  test('hay exactamente 3 niveles: facil, medio, dificil', () => {
    expect([...BOT_DIFFICULTIES]).toEqual(['facil', 'medio', 'dificil']);
  });

  test('randomBotDifficulty devuelve un nivel valido', () => {
    const level = randomBotDifficulty(() => 0.42);
    expect(BOT_DIFFICULTIES).toContain(level);
  });

  test('randomBotDifficulty es determinista con rng inyectado', () => {
    expect(randomBotDifficulty(() => 0)).toBe('facil');
    expect(randomBotDifficulty(() => 0.5)).toBe('medio');
    expect(randomBotDifficulty(() => 0.99)).toBe('dificil');
  });
});

function botHand(botCards: Card[], humanCards?: Card[], mano: Seat = 0) {
  return createHand({
    id: 1,
    manoSeat: mano,
    dealerSeat: mano === 0 ? 1 : 0,
    seats: [0, 1],
    handsOverride: {
      0: humanCards ?? [makeCard(4, 'copa'), makeCard(5, 'oro'), makeCard(6, 'basto')],
      1: botCards,
    },
  });
}

describe('bot: cuando no debe actuar', () => {
  test('null sin mano', () => {
    expect(decideBotAction(null, 1, 'medio')).toBeNull();
  });

  test('null con mano terminada', () => {
    const h = botHand([makeCard(4, 'copa'), makeCard(5, 'oro'), makeCard(6, 'basto')]);
    h.finished = true;
    expect(decideBotAction(h, 1, 'dificil')).toBeNull();
  });

  test('null si no es su turno ni hay pendiente para el', () => {
    const h = botHand([makeCard(1, 'espada'), makeCard(3, 'oro'), makeCard(2, 'copa')]);
    // mano 0: turno del humano, sin cantos
    expect(decideBotAction(h, 1, 'dificil')).toBeNull();
  });
});

describe('bot facil', () => {
  test('rechaza truco con mano debil', () => {
    const h = botHand([makeCard(4, 'copa'), makeCard(5, 'oro'), makeCard(6, 'basto')]);
    singTruco(h, 0);
    expect(decideBotAction(h, 1, 'facil')).toEqual({ type: 'respondTruco', quiero: false });
  });

  test('acepta truco con la mayor', () => {
    const h = botHand([makeCard(1, 'espada'), makeCard(5, 'oro'), makeCard(6, 'basto')]);
    singTruco(h, 0);
    expect(decideBotAction(h, 1, 'facil')).toEqual({ type: 'respondTruco', quiero: true });
  });

  test('juega carta al azar con el rng dado', () => {
    const h = botHand(
      [makeCard(1, 'espada'), makeCard(3, 'oro'), makeCard(2, 'copa')],
      undefined,
      1, // mano el bot: es su turno
    );
    const action = decideBotAction(h, 1, 'facil', () => 0) as BotAction;
    expect(action).toEqual({ type: 'play', cardId: '1-espada' });
  });

  test('nunca canta aunque tenga juegazo', () => {
    const h = botHand(
      [makeCard(1, 'espada'), makeCard(1, 'basto'), makeCard(7, 'espada')],
      undefined,
      1,
    );
    const action = decideBotAction(h, 1, 'facil', () => 0) as BotAction;
    expect(action!.type).toBe('play');
  });
});

describe('bot medio', () => {
  test('gana barato: la menor carta que gana', () => {
    const h = botHand(
      [makeCard(3, 'copa'), makeCard(5, 'basto'), makeCard(12, 'oro')],
      [makeCard(6, 'oro'), makeCard(4, 'copa'), makeCard(5, 'copa')],
    );
    playCard(h, 0, '6-oro'); // humano abre con 6
    expect(decideBotAction(h, 1, 'medio')).toEqual({ type: 'play', cardId: '12-oro' });
  });

  test('sin ganadora juega la menor', () => {
    const h = botHand(
      [makeCard(3, 'copa'), makeCard(5, 'basto'), makeCard(12, 'oro')],
      [makeCard(1, 'espada'), makeCard(4, 'copa'), makeCard(5, 'copa')],
    );
    playCard(h, 0, '1-espada'); // imposible de ganar
    expect(decideBotAction(h, 1, 'medio')).toEqual({ type: 'play', cardId: '5-basto' });
  });

  test('canta envido con 32 de tanto en primera baza', () => {
    const h = botHand(
      [makeCard(7, 'espada'), makeCard(5, 'espada'), makeCard(4, 'copa')],
      undefined,
      1,
    );
    expect(decideBotAction(h, 1, 'medio')).toEqual({ type: 'singEnvido', level: 'real_envido' });
  });
});

describe('bot dificil', () => {
  test('liderando guarda la brava y sale de la menor', () => {
    const h = botHand(
      [makeCard(1, 'espada'), makeCard(5, 'oro'), makeCard(6, 'copa')],
      undefined,
      1,
    );
    expect(decideBotAction(h, 1, 'dificil')).toEqual({ type: 'play', cardId: '5-oro' });
  });

  test('canta truco con 2 fuertes', () => {
    const h = botHand(
      [makeCard(1, 'espada'), makeCard(3, 'oro'), makeCard(5, 'copa')],
      undefined,
      1,
    );
    expect(decideBotAction(h, 1, 'dificil')).toEqual({ type: 'singTruco' });
  });

  test('nunca juega tapada', () => {
    const h = botHand(
      [makeCard(1, 'espada'), makeCard(3, 'oro'), makeCard(2, 'copa')],
      undefined,
      1,
    );
    for (const level of ['facil', 'medio', 'dificil'] as const) {
      const action = decideBotAction(h, 1, level, () => 0.9);
      if (action?.type === 'play') expect(action).not.toHaveProperty('faceDown');
    }
  });
});
