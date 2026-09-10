import type { BotDifficulty, HandState, Seat } from './types.js';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['facil', 'medio', 'dificil'];

export function randomBotDifficulty(rng: () => number = Math.random): BotDifficulty {
  return BOT_DIFFICULTIES[Math.floor(rng() * BOT_DIFFICULTIES.length)];
}

// Estructura del cerebro del bot. La logica de juego se implementa despues;
// mientras tanto devuelve null (= el bot no actua).
export type BotAction = never;

export function decideBotAction(_hand: HandState | null, _seat: Seat): BotAction | null {
  return null;
}
