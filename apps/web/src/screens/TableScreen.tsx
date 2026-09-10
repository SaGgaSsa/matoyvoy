import React, { useEffect, useRef, useState } from 'react';
import { handEnvidoPoints } from '@matoyvoy/game-core';
import { getSocket, clearCredentials } from '../socket';
import type { RoomStatePayload, Seat } from '../gameTypes';
import { CardView, CardBack } from '../components/CardView';
import { ScoreBoard } from '../components/ScoreBoard';
import { Logo } from '../components/Logo';

function playerName(room: RoomStatePayload['room'], seat: number | null): string {
  if (seat === null || seat === undefined) return '—';
  const p = room.players.find((x) => x.seat === seat);
  return p ? p.name : `Asiento ${seat}`;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ---- Toast de cantos (no modal): truco/envido + quiero/no quiero ----
const CANTO_LABEL: Record<string, string> = {
  truco: '¡TRUCO!',
  retruco: '¡RETRUCO!',
  'vale cuatro': '¡VALE CUATRO!',
  envido: 'ENVIDO',
  real_envido: 'REAL ENVIDO',
  falta_envido: 'FALTA ENVIDO',
};

type CantoVerb = 'canta' | 'quiere' | 'no quiere';

interface ParsedCanto {
  seat: number;
  verb: CantoVerb;
  level: string;
  detail: string;
}

function parseCantoLine(line: string): ParsedCanto | null {
  const m = line.match(/^(\d+)\s+(no quiere|quiere|canta)\s+([\wñ ]+)/i);
  if (!m) return null;
  const level = m[3].trim().toLowerCase();
  if (!(level in CANTO_LABEL)) return null;
  const detail = (line.split(':')[1] ?? '').trim();
  return { seat: Number(m[1]), verb: m[2].toLowerCase() as CantoVerb, level, detail };
}

const TOAST_MS = 4000;

function CantoToast({ canto, onClose }: { canto: ParsedCanto & { who: string }; onClose: () => void }): React.ReactElement {
  const label = CANTO_LABEL[canto.level];
  const isTruco = canto.level === 'truco' || canto.level === 'retruco' || canto.level === 'vale cuatro';
  const tone = canto.verb === 'no quiere' ? 'noquiero' : canto.verb === 'quiere' ? 'quiero' : isTruco ? 'truco' : 'envido';
  const emoji = canto.verb === 'quiere' ? '✅' : canto.verb === 'no quiere' ? '❌' : '📣';
  const title =
    canto.verb === 'canta'
      ? `${canto.who} cantó ${label}`
      : canto.verb === 'quiere'
        ? `${canto.who} quiso ${isTruco ? 'el truco' : 'el envido'}`
        : `${canto.who} no quiso ${isTruco ? 'el truco' : 'el envido'}`;
  return (
    <div className={`canto-toast ${tone}`} role="status">
      <span className="emoji">{emoji}</span>
      <span>
        <div className="kind">{title}</div>
        {canto.detail && <div className="detail">{canto.detail}</div>}
      </span>
      <button className="x" onClick={onClose} aria-label="Cerrar aviso">✕</button>
    </div>
  );
}

export function TableScreen({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, match, hand, mySeat, myRole, isHost, log } = state;
  const socket = getSocket();
  const isSpectator = myRole === 'spectator';
  const isBotRoom = Boolean(room.botDifficulty);
  const [tapada, setTapada] = useState(false);
  const myTurn = Boolean(hand && hand.turnSeat === mySeat && !hand.finished);

  // Toast no-modal con el último canto (sirve en 1v1 humano, vs máquina y espectador).
  const [toast, setToast] = useState<(ParsedCanto & { key: string }) | null>(null);
  const toastTimer = useRef<number | null>(null);
  const logLen = hand?.log.length ?? 0;
  const handId = hand?.id ?? -1;
  useEffect(() => {
    if (handId < 0 || logLen === 0) {
      setToast(null);
      return;
    }
    const lines = hand?.log ?? [];
    const parsed = parseCantoLine(lines[logLen - 1]);
    if (!parsed) return; // una jugada no pisa el aviso vigente
    setToast({ ...parsed, key: `${handId}:${logLen - 1}` });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [handId, logLen]);

  const trucoPendingForMe = Boolean(hand?.truco.pending && hand.truco.pendingTo === mySeat);
  const envidoPendingForMe = Boolean(hand?.envido.pending && hand.envido.pendingTo === mySeat);
  const noPending = Boolean(hand && !hand.truco.pending && !hand.envido.pending && !hand.finished);

  const canSingTruco = Boolean(noPending && !isSpectator);
  const canSingEnvido = Boolean(
    noPending && !isSpectator && hand && !hand.envido.done &&
    hand.currentTrickIndex === 0 && hand.truco.level === 'none',
  );

  const nextTrucoLabel = !hand || hand.truco.level === 'none' ? 'Truco'
    : hand.truco.level === 'truco' ? '¡Retruco!'
    : hand.truco.level === 'retruco' ? '¡Vale cuatro!'
    : 'Truco';

  // Yo abajo, el resto arriba/izq/der (listo para 4 asientos en 2v2).
  const others = room.players.filter((p) => p.seat !== mySeat);
  const top = others[0] ?? null;
  const left = others[1] ?? null;
  const right = others[2] ?? null;

  const tanto = hand && mySeat !== null
    ? handEnvidoPoints([...(hand.myCards ?? []), ...((hand.played[mySeat] ?? []) as any)])
    : null;

  const exit = (): void => {
    socket.emit('leaveRoom');
    clearCredentials();
    window.location.reload();
  };

  const play = (cardId: string): void => {
    socket.emit('playCard', { cardId, faceDown: tapada });
    setTapada(false);
  };

  const seatTag = (
    seat: Seat,
    name: string,
    sub: string,
    pos: 'top' | 'left' | 'right',
    roleBadge?: string,
    isBot?: boolean,
    isTurn?: boolean,
  ): React.ReactElement => {
    const count = hand?.handCounts[seat] ?? 0;
    return (
      <div className={`seat-tag ${pos}${isTurn ? ' turn' : ''}`}>
        <span className="avatar">{isBot ? '🤖' : initials(name)}</span>
        <span>
          <strong>{name}{isBot ? ' 🤖' : ''}</strong>
          <br />
          <small className="muted">{sub}</small>
        </span>
        {roleBadge && (
          <span className={`badge-role ${roleBadge === 'MANO' ? 'mano' : ''}`}>{roleBadge}</span>
        )}
        <span className="row" style={{ gap: 2 }}>
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} style={{ width: 10, height: 14, borderRadius: 3, background: 'var(--surface-high)' }} />
          ))}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="topbar">
        <span className="brand"><Logo height={30} /></span>
        <span><strong>{room.name || `Mesa ${room.code}`}</strong> <span className="muted">· {room.code} · a {match?.targetScore ?? room.targetScore}</span></span>
        <span className="muted">{room.status === 'finished' ? 'Terminada' : `Mano ${match?.handNumber ?? '-'}`}</span>
      </div>

      {isSpectator && (
        <div className="panel" style={{ borderColor: 'var(--error-container)', margin: '8px 0', padding: '10px 14px' }}>
          <span className="pill live"><span className="dot" />En vivo · Modo espectador</span>
          <span className="muted" style={{ marginLeft: 8 }}>Ves todas las cartas jugadas, nunca las manos privadas.</span>
        </div>
      )}

      {match?.finished && (
        <div className="panel brass">
          <h2>🏆 Ganó el equipo {match.winnerTeam}</h2>
          <p className="muted">Nosotros {match.scores.A} — Ellos {match.scores.B}</p>
          <div className="row">
            {isHost && <button className="btn btn-brass" onClick={() => socket.emit('backToLobby')}>Volver al lobby</button>}
            <button className="btn btn-ghost" onClick={exit}>Salir</button>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(220px, 300px) 1fr' }}>
        <div>
          <ScoreBoard state={state} />
          <div className="panel log" style={{ marginTop: 8 }}>
            <h4>Mensajes</h4>
            <ul>
              {(hand?.log ?? []).slice(-8).map((m, i) => <li key={i}>{m}</li>)}
            </ul>
            <details>
              <summary className="muted">Partida</summary>
              <ul>{log.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </details>
          </div>
        </div>

        <div>
          {match && !hand && !match.finished && (
            <div className="panel brass" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <h3>🃏 Cartas en espera</h3>
              <div className="row" style={{ justifyContent: 'center', margin: '12px 0' }}>
                <CardBack /><CardBack /><CardBack />
              </div>
              {isSpectator || !isHost ? (
                <p className="muted">Esperando que el host reparta la mano…</p>
              ) : (
                <>
                  <p className="muted">La máquina ya está lista. Repartí cuando quieras.</p>
                  <button className="btn btn-brass" onClick={() => socket.emit('dealHand')}>🃏 Repartir mano</button>
                </>
              )}
            </div>
          )}
          {hand && (
            <>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="pill">
                  <span className="dot" />
                  {hand.finished
                    ? `Ganó ${playerName(room, hand.winnerSeat)} (+${hand.pointsAtStakeTruco})`
                    : hand.turnSeat === null
                      ? 'Esperando respuesta…'
                      : `Turno: ${playerName(room, hand.turnSeat)}`}
                </span>
                <span className="pill">Mano: {playerName(room, hand.manoSeat)}</span>
                {myTurn && <span className="turn-banner"><span className="dot" />¡ES TU TURNO!{tanto !== null && <span> · tenés {tanto} de tanto</span>}</span>}
              </div>

              <div className="felt">
                {top && seatTag(top.seat, top.name, top.seat === hand.manoSeat ? 'Mano' : `Rival · ${hand.handCounts[top.seat] ?? 0} cartas`, 'top', top.seat === hand.manoSeat ? 'MANO' : undefined, top.isBot, hand.turnSeat === top.seat)}
                {left && seatTag(left.seat, left.name, 'Rival', 'left', undefined, left.isBot, hand.turnSeat === left.seat)}
                {right && seatTag(right.seat, right.name, 'Rival', 'right', undefined, right.isBot, hand.turnSeat === right.seat)}

                <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
                  {hand.tricks.map((t) => (
                    <div key={t.number} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7em', color: 'var(--muted)', marginBottom: 4 }}>
                        {`Ronda ${t.number + 1} · `}
                        {t.winnerSeat === null || t.winnerSeat === undefined ? 'en juego'
                          : t.winnerSeat === 'tie' ? 'parda'
                            : `ganó ${playerName(room, t.winnerSeat as number)}`}
                      </div>
                      <div className="row" style={{ justifyContent: 'center' }}>
                        {t.plays.map((p, i) => {
                          const won = t.winnerSeat !== null && t.winnerSeat !== undefined && t.winnerSeat !== 'tie' && t.winnerSeat === p.seat;
                          return (
                            <span key={i} className={`trick-card${won ? ' won' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              {p.faceDown ? <CardBack /> : <CardView card={p.card} small />}
                              <small className="muted">{playerName(room, p.seat)}{p.faceDown ? ' (tapada)' : ''}</small>
                            </span>
                          );
                        })}
                        {t.plays.length === 0 && <CardBack />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isSpectator && (
                <div style={{ marginTop: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h4 style={{ marginBottom: 6 }}>Tus cartas {mySeat !== null && `(asiento ${mySeat})`}</h4>
                    <label className="check" title="La próxima carta sale boca abajo: pierde contra todo, solo empata con otra tapada">
                      <input type="checkbox" checked={tapada} onChange={(e) => setTapada(e.target.checked)} disabled={!myTurn} />
                      Jugar tapada
                    </label>
                  </div>
                  <div className="row fan" key={hand.id}>
                    {(hand.myCards ?? []).map((c, i) => (
                      <span key={c.id} className="fan-card" style={{ '--fan-i': i } as React.CSSProperties}>
                        <CardView card={c} playable={myTurn} onPlay={() => play(c.id)} />
                      </span>
                    ))}
                    {(hand.myCards ?? []).length === 0 && <span className="muted">Sin cartas en mano.</span>}
                  </div>
                </div>
              )}

              <div className="canto-bar" style={{ marginTop: 10 }}>
                {trucoPendingForMe && (
                  <div className="row canto-pop">
                    <strong>Te cantaron {hand.truco.level}:</strong>
                    <button className="btn btn-green btn-sm" onClick={() => socket.emit('respondTruco', { quiero: true })}>Quiero</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('respondTruco', { quiero: false })}>No quiero</button>
                  </div>
                )}
                {envidoPendingForMe && (
                  <div className="row canto-pop">
                    <strong>Te cantaron {hand.envido.level}:</strong>
                    <button className="btn btn-green btn-sm" onClick={() => socket.emit('respondEnvido', { quiero: true })}>Quiero</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('respondEnvido', { quiero: false })}>No quiero</button>
                  </div>
                )}
                {noPending && !isSpectator && (
                  <>
                    <div className="canto-group">
                      {canSingTruco && <button className="btn btn-brass btn-sm" onClick={() => socket.emit('singTruco', {})}>{nextTrucoLabel}</button>}
                      {canSingEnvido && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('singEnvido', { level: 'envido' })}>Envido</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('singEnvido', { level: 'real_envido' })}>Real envido</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('singEnvido', { level: 'falta_envido' })}>Falta envido</button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {hand.finished && !match?.finished && (
                  isBotRoom
                    ? <button className="btn btn-green btn-sm" onClick={() => socket.emit('dealHand')}>🃏 Repartir mano →</button>
                    : <button className="btn btn-green btn-sm" onClick={() => socket.emit('nextHand')}>Siguiente mano →</button>
                )}
                {isSpectator && <span className="muted">Los espectadores no pueden cantar ni jugar.</span>}
              </div>

              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={exit}>Salir de la mesa</button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <CantoToast canto={{ ...toast, who: playerName(room, toast.seat) }} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
