import React from 'react';
import type { RoomStatePayload } from '../gameTypes';

// Un tanto = cuadrado de fósforos + diagonal (tradicional). Máx 5 por caja.
function FosforoBox({ count }: { count: number }): React.ReactElement {
  // count 0..5: top, right, bottom, left, diagonal
  const lines = [
    count >= 1 && <line key="t" x1="4" y1="4" x2="28" y2="4" />,
    count >= 2 && <line key="r" x1="28" y1="4" x2="28" y2="28" />,
    count >= 3 && <line key="b" x1="28" y1="28" x2="4" y2="28" />,
    count >= 4 && <line key="l" x1="4" y1="28" x2="4" y2="4" />,
    count >= 5 && <line key="d" x1="4" y1="28" x2="28" y2="4" stroke="#ef4444" />,
  ];
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="#d97706" strokeWidth="2.5">
      {lines}
      <circle cx="4" cy="4" fill="#ef4444" r="2" stroke="none" />
      <circle cx="28" cy="4" fill="#ef4444" r="2" stroke="none" />
      <circle cx="28" cy="28" fill="#ef4444" r="2" stroke="none" />
      <circle cx="4" cy="28" fill="#ef4444" r="2" stroke="none" />
    </svg>
  );
}

export function Fosforos({ points }: { points: number }): React.ReactElement {
  const boxes: number[] = [];
  let rest = Math.max(0, points);
  while (rest > 0) {
    boxes.push(Math.min(5, rest));
    rest -= 5;
  }
  if (boxes.length === 0) return <span className="muted">—</span>;
  return (
    <div className="fosforos">
      {boxes.map((c, i) => (
        <FosforoBox key={i} count={c} />
      ))}
    </div>
  );
}

// El Anotador Criollo: NOSOTROS (equipo A) vs ELLOS (equipo B).
export function ScoreBoard({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, match } = state;
  const scores = match?.scores ?? { A: 0, B: 0 };
  const target = match?.targetScore ?? room.targetScore ?? 15;

  const nameOf = (team: 'A' | 'B'): string => {
    const names = room.players.filter((p) => p.team === team).map((p) => p.name);
    return names.join(' & ') || (team === 'A' ? 'Nosotros' : 'Ellos');
  };
  const phase = (score: number): string => {
    if (target === 30) return score < 15 ? 'EN LAS MALAS' : 'EN LAS BUENAS';
    return `${Math.max(0, target - score)} PARA CERRAR`;
  };

  return (
    <div className="scoreboard">
      <h4>📖 EL ANOTADOR <span className="muted">· a {target}</span></h4>
      <div className="score-cols">
        <div className="score-team us">
          <div><strong>NOSOTROS</strong></div>
          <div className="muted" style={{ fontSize: '0.75em' }}>{nameOf('A')}</div>
          <div className="num">{scores.A}</div>
          <div className="muted" style={{ fontSize: '0.7em' }}>{phase(scores.A)}</div>
          <Fosforos points={scores.A} />
        </div>
        <div className="score-team them">
          <div><strong>ELLOS</strong></div>
          <div className="muted" style={{ fontSize: '0.75em' }}>{nameOf('B')}</div>
          <div className="num">{scores.B}</div>
          <div className="muted" style={{ fontSize: '0.7em' }}>{phase(scores.B)}</div>
          <Fosforos points={scores.B} />
        </div>
      </div>
      {state.hand && !state.hand.finished && (
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: '0.8em' }}>
          <span className="muted">En juego:</span>
          <strong style={{ color: 'var(--secondary)' }}>
            {state.hand.pointsAtStakeTruco > 1 ? `TRUCO (${state.hand.pointsAtStakeTruco} PTS)` : '1 PUNTO'}
          </strong>
        </div>
      )}
    </div>
  );
}
