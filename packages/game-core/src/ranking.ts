import type { Card, Seat, TrickResult } from './types.js';

// Jerarquia de Truco Argentino (mayor numero = mas fuerte).
// 1-espada > 1-basto > 7-espada > 7-oro > 3s > 2s > 1-oro/1-copa > 12s > 11s > 10s > 7-copa/7-basto > 6s > 5s > 4s
export function trucoPower(card: Card): number {
  const { rank, suit } = card;
  if (rank === 1 && suit === 'espada') return 14;
  if (rank === 1 && suit === 'basto') return 13;
  if (rank === 7 && suit === 'espada') return 12;
  if (rank === 7 && suit === 'oro') return 11;
  if (rank === 3) return 10;
  if (rank === 2) return 9;
  if (rank === 1) return 8; // oro y copa (ancho falso)
  if (rank === 12) return 7;
  if (rank === 11) return 6;
  if (rank === 10) return 5;
  if (rank === 7) return 4; // copa y basto
  if (rank === 6) return 3;
  if (rank === 5) return 2;
  if (rank === 4) return 1;
  throw new Error(`Carta invalida para truco: ${rank} de ${suit}`);
}

// 1 = a gana, -1 = b gana, 0 = parda
export function compareCards(a: Card, b: Card): number {
  const pa = trucoPower(a);
  const pb = trucoPower(b);
  if (pa > pb) return 1;
  if (pa < pb) return -1;
  return 0;
}

export function trickWinner(plays: { seat: Seat; card: Card }[]): Seat | 'tie' {
  if (plays.length === 0) throw new Error('Sin jugadas');
  let best = plays[0]!;
  let tie = false;
  for (let i = 1; i < plays.length; i++) {
    const cmp = compareCards(plays[i]!.card, best.card);
    if (cmp > 0) {
      best = plays[i]!;
      tie = false;
    } else if (cmp === 0) {
      tie = true;
    }
  }
  return tie && plays.length > 1 && isTopTie(plays) ? 'tie' : tie ? checkTie(plays) : best.seat;
}

function isTopTie(plays: { seat: Seat; card: Card }[]): boolean {
  // Si las mejores cartas empatan en poder, es parda aunque haya una peor.
  let max = -1;
  for (const p of plays) max = Math.max(max, trucoPower(p.card));
  const count = plays.filter((p) => trucoPower(p.card) === max).length;
  return count > 1;
}

function checkTie(plays: { seat: Seat; card: Card }[]): Seat | 'tie' {
  return isTopTie(plays) ? 'tie' : winnerAmongBest(plays);
}

function winnerAmongBest(plays: { seat: Seat; card: Card }[]): Seat {
  let max = -1;
  for (const p of plays) max = Math.max(max, trucoPower(p.card));
  const best = plays.find((p) => trucoPower(p.card) === max)!;
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
