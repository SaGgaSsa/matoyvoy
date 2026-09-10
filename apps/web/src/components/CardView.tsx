import React from 'react';
import { suitTheme, themeOf } from '@matoyvoy/game-core';
import type { Card } from '../gameTypes';

// Naipe estilo diseño.md. La identidad visual (nombres, apodos, iconos)
// sale del catalogo central de game-core: para re-tematizar las cartas
// se edita solo el catalogo, este componente no cambia.
export function CardView({
  card,
  playable,
  small,
  onPlay,
}: {
  card: Card;
  playable?: boolean;
  small?: boolean;
  onPlay?: () => void;
}): React.ReactElement {
  const meta = suitTheme(card.suit);
  const theme = themeOf(card);
  const nick = theme.nick ?? `${card.rank} DE ${meta.name}`;
  return (
    <button
      className={`naipe ${playable ? 'playable' : ''} ${small ? 'small' : ''}`}
      disabled={!playable}
      onClick={onPlay}
      title={theme.name}
      style={{ cursor: playable ? 'pointer' : 'default' }}
    >
      <span className="corner" style={{ color: meta.color }}>
        <span className="rank">{card.rank}</span>
        <small>{meta.icon}</small>
      </span>
      <span className="center">
        <span className="art">{meta.art}</span>
        <span className="nick" style={{ color: meta.color }}>{nick}</span>
      </span>
      <span className="corner bottom" style={{ color: meta.color }}>
        <span className="rank">{card.rank}</span>
        <small>{meta.icon}</small>
      </span>
    </button>
  );
}

export function CardBack(): React.ReactElement {
  return <div className="naipe-back">?</div>;
}
