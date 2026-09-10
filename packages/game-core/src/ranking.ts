import type { Card, Seat, Suit, TrickResult, TrickPlay } from './types.js';
import { cardKey } from './cards.js';

// Jerarquia de Truco Argentino (mayor numero = mas fuerte).
// 1-espada > 1-basto > 7-espada > 7-oro > 3s > 2s > 1-oro/1-copa > 12s > 11s > 10s > 7-copa/7-basto > 6s > 5s > 4s
//
// Representacion interna: la jerarquia vive en el MOTOR como tabla sobre
// (rank, suit). No depende de nombres ni del catalogo tematico.
const TRUCO_POWER: Record<string, number> = {
  [cardKey(1, 'espada')]: 14,
  [cardKey(1, 'basto')]: 13,
  [cardKey(7, 'espada')]: 12,
  [cardKey(7, 'oro')]: 11,
};

for (const suit of ['espada', 'basto', 'oro', 'copa'] as Suit[]) {
  TRUCO_POWER[cardKey(3, suit)] = 10;
  TRUCO_POWER[cardKey(2, suit)] = 9;
  TRUCO_POWER[cardKey(12, suit)] = 7;
  TRUCO_POWER[cardKey(11, suit)] = 6;
  TRUCO_POWER[cardKey(10, suit)] = 5;
  TRUCO_POWER[cardKey(6, suit)] = 3;
  TRUCO_POWER[cardKey(5, suit)] = 2;
  TRUCO_POWER[cardKey(4, suit)] = 1;
}
// Anchos falsos y sietes falsos (los que no son bravas).
TRUCO_POWER[cardKey(1, 'oro')] = 8;
TRUCO_POWER[cardKey(1, 'copa')] = 8;
TRUCO_POWER[cardKey(7, 'copa')] = 4;
TRUCO_POWER[cardKey(7, 'basto')] = 4;

export function trucoPower(card: Card): number {
  const power = TRUCO_POWER[cardKey(card)];
  if (power === undefined) throw new Error(`Carta invalida para truco: ${card.rank} de ${card.suit}`);
  return power;
}

// Expuesta para depurar/testear la jerarquia completa sin conocer el codigo.
export function trucoPowerTable(): Record<string, number> {
  return { ...TRUCO_POWER };
}

// Poder efectivo en una baza: la tapada vale -1 (pierde contra todo,
// empata solo con otra tapada). Fuera de la baza, la carta conserva su poder.
export function effectivePower(play: TrickPlay): number {
  if (play.faceDown) return -1;
  return trucoPower(play.card);
}

// 1 = a gana, -1 = b gana, 0 = parda
export function compareCards(a: Card, b: Card): number {
  const pa = trucoPower(a);
  const pb = trucoPower(b);
  if (pa > pb) return 1;
  if (pa < pb) return -1;
  return 0;
}

export function trickWinner(plays: { seat: Seat; card: Card; faceDown?: boolean }[]): Seat | 'tie' {
  if (plays.length === 0) throw new Error('Sin jugadas');
  let best = plays[0]!;
  let tie = false;
  for (let i = 1; i < plays.length; i++) {
    const pa = effectivePower(plays[i]!);
    const pb = effectivePower(best);
    const cmp = pa > pb ? 1 : pa < pb ? -1 : 0;
    if (cmp > 0) {
      best = plays[i]!;
      tie = false;
    } else if (cmp === 0) {
      tie = true;
    }
  }
  return tie && plays.length > 1 && isTopTie(plays) ? 'tie' : tie ? checkTie(plays) : best.seat;
}

function isTopTie(plays: { seat: Seat; card: Card; faceDown?: boolean }[]): boolean {
  // Si las mejores cartas empatan en poder, es parda aunque haya una peor.
  let max = -2;
  for (const p of plays) max = Math.max(max, effectivePower(p));
  const count = plays.filter((p) => effectivePower(p) === max).length;
  return count > 1;
}

function checkTie(plays: { seat: Seat; card: Card; faceDown?: boolean }[]): Seat | 'tie' {
  return isTopTie(plays) ? 'tie' : winnerAmongBest(plays);
}

function winnerAmongBest(plays: { seat: Seat; card: Card; faceDown?: boolean }[]): Seat {
  let max = -2;
  for (const p of plays) max = Math.max(max, effectivePower(p));
  const best = plays.find((p) => effectivePower(p) === max)!;
  return best.seat;
}

// Ganador de la mano (mejor de 3) con reglas de parda argentinas:
// - Gana quien gana 2 bazas.
// - Si 1ra emparda, gana la 2da.
// - Si 2da emparda, gana la 1ra.
// - Si las tres empatan, gana la mano.
// - Si 1ra gana A y 2da emparda, gana A. (la parda favorece al de 1ra)
// - Si 1ra gana A, 2da gana B, se juega 3ra y define.
export function resolveHandWinner(
  tricks: TrickResult[],
  manoSeat: Seat,
): Seat | 'tie' {
  const winners = tricks.map((t) => t.winnerSeat);
  const w0 = winners[0];
  const w1 = winners[1];
  const w2 = winners[2];

  // Solo 1 baza jugada: no hay ganador aun salvo que se llame con 1? Devolvemos tie como "sin definir".
  if (tricks.length === 1) return 'tie';

  if (tricks.length === 2) {
    // Casos con 2 bazas:
    if (w0 === 'tie' && w1 === 'tie') return 'tie'; // se juega 3ra, pero por ahora indefinido
    if (w0 === 'tie') return (w1 as Seat) ?? 'tie'; // gana 2da
    if (w1 === 'tie') return (w0 as Seat) ?? 'tie'; // gana 1ra
    if (w0 === w1) return (w0 as Seat) ?? 'tie'; // mismo gana 2
    return 'tie'; // 1-1, falta 3ra
  }

  // 3 bazas:
  if (w0 !== 'tie' && w0 === w1) return w0 as Seat;
  if (w0 !== 'tie' && w0 === w2) return w0 as Seat;
  if (w1 !== 'tie' && w1 === w2) return w1 as Seat;
  // Pardas:
  if (w0 === 'tie' && w1 === 'tie') return manoSeat; // triple parda -> mano (w2 tambien tie en este caso)
  if (w0 === 'tie') {
    if (w1 === 'tie') return manoSeat;
    return w1 as Seat; // 1ra parda -> gana 2da (si 2da y 3ra... pero si w1!=w2? ej parda, B, C? en 1v1 no hay C)
  }
  if (w1 === 'tie') {
    return w0 as Seat; // 2da parda -> gana 1ra
  }
  if (w2 === 'tie') {
    // 1ra A, 2da B, 3ra parda -> gana 1ra
    return w0 as Seat;
  }
  // Si llegamos aca con 3 resultados distintos (imposible en 1v1), gana mano.
  return manoSeat;
}
