import type { Card, Rank, Suit } from './types.js';
import { cardKey } from './cards.js';

export { cardKey };

// ---------------------------------------------------------------------------
// Catalogo central de identidad visual/tematica.
//
// El motor (ranking, envido, mano, match) SOLO ve { rank, suit } y NUNCA
// importa este modulo. Para re-tematizar el juego (ej: 40 enfermedades
// definidas a mano) se edita UNICAMENTE este archivo: se cambia el `name`
// (y opcionalmente `nick`/`art`) de cada entrada, sin tocar ninguna regla.
// ---------------------------------------------------------------------------

export interface CardTheme {
  /** Nombre tematico de la carta. Hoy: nombre tradicional; manana: enfermedad. */
  name: string;
  /** Apodo corto para mostrar en el naipe (opcional). */
  nick?: string;
}

export interface SuitTheme {
  name: string;
  icon: string;
  art: string;
  color: string;
}

const NUM_NAMES: Record<Exclude<Rank, 10 | 11 | 12>, string> = {
  1: 'Ancho',
  2: 'Dos',
  3: 'Tres',
  4: 'Cuatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Siete',
};

const FIGURE_NAMES: Record<10 | 11 | 12, string> = {
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

const SUIT_NAMES: Record<Suit, string> = {
  espada: 'espadas',
  basto: 'bastos',
  oro: 'oros',
  copa: 'copas',
};

function traditionalName(rank: Rank, suit: Suit): string {
  const head = rank >= 10 ? FIGURE_NAMES[rank as 10 | 11 | 12] : NUM_NAMES[rank as keyof typeof NUM_NAMES];
  return `${head} de ${SUIT_NAMES[suit]}`;
}

function buildCatalog(): Record<string, CardTheme> {
  const suits: Suit[] = ['espada', 'basto', 'oro', 'copa'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const out: Record<string, CardTheme> = {};
  for (const suit of suits) {
    for (const rank of ranks) {
      out[cardKey(rank, suit)] = { name: traditionalName(rank, suit) };
    }
  }
  // Apodos tradicionales de las bravas.
  out[cardKey(1, 'espada')].nick = 'EL MACHO';
  out[cardKey(1, 'basto')].nick = 'LA SEGUNDA';
  out[cardKey(7, 'espada')].nick = '7 BRAVO';
  out[cardKey(7, 'oro')].nick = '7 BRAVO';
  return out;
}

export const CARD_CATALOG: Record<string, CardTheme> = buildCatalog();

export function themeOf(card: Card): CardTheme {
  const theme = CARD_CATALOG[cardKey(card)];
  if (!theme) throw new Error(`Carta sin tema en el catalogo: ${cardKey(card)}`);
  return theme;
}

export const SUIT_THEMES: Record<Suit, SuitTheme> = {
  espada: { icon: '⚔️', art: '🗡️', color: '#b91c1c', name: 'ESPADA' },
  basto: { icon: '🪵', art: '🌿', color: '#1c1917', name: 'BASTO' },
  oro: { icon: '🪙', art: '🪙', color: '#b45309', name: 'ORO' },
  copa: { icon: '🍷', art: '🍷', color: '#92400e', name: 'COPA' },
};

export function suitTheme(suit: Suit): SuitTheme {
  return SUIT_THEMES[suit];
}
