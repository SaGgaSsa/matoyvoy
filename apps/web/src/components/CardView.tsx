import React from 'react';
import type { Card } from '../gameTypes';

function suitSymbol(suit: string): string {
  if (suit === 'espada') return '⚔';
  if (suit === 'basto') return '♦'; // placeholder simple
  if (suit === 'oro') return '●';
  return '♥';
}

// Componente reemplazable: hoy rectangulo simple, mañana diseño real.
export function CardView({
  card,
  playable,
  onPlay,
}: {
  card: Card;
  playable?: boolean;
  onPlay?: () => void;
}): React.ReactElement {
  return (
    <button
      className={`card ${playable ? 'playable' : ''}`}
      disabled={!playable}
      onClick={onPlay}
      title={`${card.rank} de ${card.suit}`}
    >
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{suitSymbol(card.suit)}</span>
      <span className="card-name">{card.suit}</span>
    </button>
  );
}

export function CardBack(): React.ReactElement {
  return <div className="card back">?</div>;
}
