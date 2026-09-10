import { describe, test, expect } from 'vitest';
import { BOT_DIFFICULTIES, randomBotDifficulty, decideBotAction } from '../src/bot.js';

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

describe('bot: cerebro pendiente', () => {
  test('decideBotAction devuelve null hasta que se implemente la logica', () => {
    expect(decideBotAction(null, 1)).toBeNull();
  });
});
