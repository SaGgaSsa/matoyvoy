import { describe, test, expect } from 'vitest';
import { makeCard } from '../src/cards.js';
import { handEnvidoPoints, envidoPointsForLevel } from '../src/envido.js';

describe('envido', () => {
  test('par del mismo palo suma 20', () => {
    // 7 oro + 6 oro = 33
    expect(handEnvidoPoints([makeCard(7, 'oro'), makeCard(6, 'oro'), makeCard(4, 'copa')])).toBe(33);
  });
  test('figuras valen 0', () => {
    // 12 oro + 11 oro mismo palo = 20
    expect(handEnvidoPoints([makeCard(12, 'oro'), makeCard(11, 'oro'), makeCard(4, 'copa')])).toBe(20);
  });
  test('sin par vale la mas alta', () => {
    expect(handEnvidoPoints([makeCard(7, 'oro'), makeCard(6, 'copa'), makeCard(4, 'basto')])).toBe(7);
  });
  test('todas figuras sin par = 0', () => {
    expect(handEnvidoPoints([makeCard(12, 'oro'), makeCard(11, 'copa'), makeCard(10, 'basto')])).toBe(0);
  });
  test('elige el mejor par', () => {
    // oro 7+2=29 vs copa 5+4=29 -> 29; mejor caso con dos pares
    const v = handEnvidoPoints([makeCard(7, 'oro'), makeCard(2, 'oro'), makeCard(5, 'copa')]);
    expect(v).toBe(29);
  });
  test('puntajes por nivel', () => {
    expect(envidoPointsForLevel('envido', 0, 15)).toBe(2);
    expect(envidoPointsForLevel('real_envido', 0, 15)).toBe(3);
    expect(envidoPointsForLevel('falta_envido', 10, 15)).toBe(5);
  });
});
