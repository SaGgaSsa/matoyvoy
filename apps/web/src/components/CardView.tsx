import React from 'react';
import type { Card } from '../gameTypes';

const SUIT_META: Record<string, { icon: string; art: string; color: string; name: string }> = {
  espada: { icon: '⚔️', art: '🗡️', color: '#b91c1c', name: 'ESPADA' },
  basto: { icon: '🪵', art: '🌿', color: '#1c1917', name: 'BASTO' },
  oro: { icon: '🪙', art: '🪙', color: '#b45309', name: 'ORO' },
  copa: { icon: '🍷', art: '🍷', color: '#92400e', name: 'COPA' },
};

function nickname(card: Card): string {
  if (card.rank === 1 && card.suit === 'espada') return 'EL MACHO';
  if (card.rank === 1 && card.suit === 'basto') return 'LA SEGUNDA';
  if (card.rank === 7 && card.suit === 'espada') return '7 BRAVO';
  if (card.rank === 7 && card.suit === 'oro') return '7 BRAVO';
  return `${card.rank} DE ${SUIT_META[card.suit]?.name ?? ''}`;
}

// Naipe estilo diseño.md. Componente aislado: se puede reemplazar el arte sin tocar la mesa.
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
  const meta = SUIT_META[card.suit] ?? SUIT_META.oro!;
  return (
    <button
      className={`naipe ${playable ? 'playable' : ''} ${small ? 'small' : ''}`}
      disabled={!playable}
      onClick={onPlay}
      title={`${card.rank} de ${card.suit}`}
      style={{ cursor: playable ? 'pointer' : 'default' }}
    >
      <span className="corner" style={{ color: meta.color }}>
        <span className="rank">{card.rank}</span>
        <small>{meta.icon}</small>
      </span>
      <span className="center">
        <span className="art">{meta.art}</span>
        <span className="nick" style={{ color: meta.color }}>{nickname(card)}</span>
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
