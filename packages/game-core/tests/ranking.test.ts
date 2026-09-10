import { describe, test, expect } from 'vitest';
import { makeCard } from '../src/cards.js';
import { trucoPower, compareCards, trickWinner, resolveHandWinner } from '../src/ranking.js';

describe('jerarquia de truco', () => {
  test('bravas: 1 espada > 1 basto > 7 espada > 7 oro', () => {
    expect(trucoPower(makeCard(1, 'espada'))).toBeGreaterThan(trucoPower(makeCard(1, 'basto')));
    expect(trucoPower(makeCard(1, 'basto'))).toBeGreaterThan(trucoPower(makeCard(7, 'espada')));
    expect(trucoPower(makeCard(7, 'espada'))).toBeGreaterThan(trucoPower(makeCard(7, 'oro')));
  });
  test('7 oro > 3 > 2 > 1 falso', () => {
    expect(trucoPower(makeCard(7, 'oro'))).toBeGreaterThan(trucoPower(makeCard(3, 'oro')));
    expect(trucoPower(makeCard(3, 'copa'))).toBeGreaterThan(trucoPower(makeCard(2, 'oro')));
    expect(trucoPower(makeCard(2, 'oro'))).toBeGreaterThan(trucoPower(makeCard(1, 'oro')));
  });
  test('anchos falsos > 12 > 11 > 10 > 7 falso > 6 > 5 > 4', () => {
    expect(trucoPower(makeCard(1, 'oro'))).toBeGreaterThan(trucoPower(makeCard(12, 'espada')));
    expect(trucoPower(makeCard(12, 'oro'))).toBeGreaterThan(trucoPower(makeCard(11, 'oro')));
    expect(trucoPower(makeCard(11, 'oro'))).toBeGreaterThan(trucoPower(makeCard(10, 'oro')));
    expect(trucoPower(makeCard(10, 'oro'))).toBeGreaterThan(trucoPower(makeCard(7, 'copa')));
    expect(trucoPower(makeCard(7, 'copa'))).toBeGreaterThan(trucoPower(makeCard(6, 'oro')));
    expect(trucoPower(makeCard(6, 'oro'))).toBeGreaterThan(trucoPower(makeCard(5, 'oro')));
    expect(trucoPower(makeCard(5, 'oro'))).toBeGreaterThan(trucoPower(makeCard(4, 'oro')));
  });
  test('mismo valor distinto palo emparda', () => {
    expect(compareCards(makeCard(3, 'oro'), makeCard(3, 'copa'))).toBe(0);
    expect(trickWinner([
      { seat: 0, card: makeCard(3, 'oro') },
      { seat: 1, card: makeCard(3, 'copa') },
    ])).toBe('tie');
  });
  test('1 espada le gana a todo', () => {
    const best = makeCard(1, 'espada');
    for (const c of [makeCard(1, 'basto'), makeCard(7, 'espada'), makeCard(3, 'oro'), makeCard(4, 'copa')]) {
      expect(compareCards(best, c)).toBe(1);
    }
  });
});

describe('resolucion de manos (mejor de 3 + pardas)', () => {
  const T = (w0: any, w1: any, w2?: any) => {
    const tricks: any[] = [
      { number: 0, leadSeat: 0, plays: [], winnerSeat: w0 },
      { number: 1, leadSeat: 0, plays: [], winnerSeat: w1 },
    ];
    if (w2 !== undefined) tricks.push({ number: 2, leadSeat: 0, plays: [], winnerSeat: w2 });
    return tricks;
  };
  test('gana quien gana 2 bazas', () => {
    expect(resolveHandWinner(T(0, 0), 0)).toBe(0);
  });
  test('primera parda -> gana segunda', () => {
    expect(resolveHandWinner(T('tie', 1), 0)).toBe(1);
  });
  test('segunda parda -> gana primera', () => {
    expect(resolveHandWinner(T(1, 'tie'), 0)).toBe(1);
  });
  test('1-1 y tercera define', () => {
    expect(resolveHandWinner(T(0, 1, 1), 0)).toBe(1);
    expect(resolveHandWinner(T(0, 1, 0), 0)).toBe(0);
  });
  test('triple parda -> mano', () => {
    expect(resolveHandWinner(T('tie', 'tie', 'tie'), 1)).toBe(1);
  });
  test('1ra A, 2da B, 3ra parda -> gana primera', () => {
    expect(resolveHandWinner(T(0, 1, 'tie'), 0)).toBe(0);
  });
});
