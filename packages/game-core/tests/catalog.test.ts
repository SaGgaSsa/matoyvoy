import { describe, test, expect } from 'vitest';
import { createDeck, makeCard } from '../src/cards.js';
import { CARD_CATALOG, SUIT_THEMES, themeOf, suitTheme, cardKey } from '../src/catalog.js';
import { trucoPower } from '../src/ranking.js';

describe('catalogo: una entrada por cada carta del mazo', () => {
  test('las 40 cartas del mazo tienen tema', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
    for (const card of deck) {
      expect(CARD_CATALOG[cardKey(card)], `sin tema: ${cardKey(card)}`).toBeDefined();
    }
  });

  test('las claves del catalogo son unicas y cubren todo el mazo', () => {
    const keys = new Set(Object.keys(CARD_CATALOG));
    expect(keys.size).toBe(40);
    for (const card of createDeck()) {
      expect(keys.has(cardKey(card))).toBe(true);
    }
  });

  test('themeOf devuelve el tema tradicional de las bravas', () => {
    expect(themeOf(makeCard(1, 'espada'))).toMatchObject({ name: 'Ancho de espadas', nick: 'EL MACHO' });
    expect(themeOf(makeCard(1, 'basto'))).toMatchObject({ name: 'Ancho de bastos', nick: 'LA SEGUNDA' });
    expect(themeOf(makeCard(7, 'espada'))).toMatchObject({ name: 'Siete de espadas', nick: '7 BRAVO' });
    expect(themeOf(makeCard(7, 'oro'))).toMatchObject({ name: 'Siete de oros', nick: '7 BRAVO' });
  });

  test('suitTheme describe los 4 palos', () => {
    expect(Object.keys(SUIT_THEMES).sort()).toEqual(['basto', 'copa', 'espada', 'oro']);
    expect(suitTheme('espada')).toMatchObject({ name: 'ESPADA' });
  });
});

describe('catalogo: el motor no depende del tema', () => {
  test('el poder de una carta no cambia con su tema', () => {
    // Las reglas solo ven palo/valor: dos cartas con igual (rank, suit)
    // tienen igual poder, exista o no el catalogo.
    const a = makeCard(1, 'espada');
    const b = { ...a };
    expect(themeOf(a)).toBeDefined();
    expect(trucoPower(a)).toBe(trucoPower(b));
  });
});
