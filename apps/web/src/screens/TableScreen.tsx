import React from 'react';
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

export function TableScreen({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, match, hand, mySeat, myRole, isHost, log } = state;
  const socket = getSocket();
  const isSpectator = myRole === 'spectator';
  const myTurn = Boolean(hand && hand.turnSeat === mySeat && !hand.finished);

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

  const seatTag = (
    seat: Seat,
    name: string,
    sub: string,
    pos: 'top' | 'left' | 'right',
    roleBadge?: string,
  ): React.ReactElement => {
    const count = hand?.handCounts[seat] ?? 0;
    return (
      <div className={`seat-tag ${pos}`}>
        <span className="avatar">{initials(name)}</span>
        <span>
          <strong>{name}</strong>
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
                {top && seatTag(top.seat, top.name, top.seat === hand.manoSeat ? 'Mano' : `Rival · ${hand.handCounts[top.seat] ?? 0} cartas`, 'top', top.seat === hand.manoSeat ? 'MANO' : undefined)}
                {left && seatTag(left.seat, left.name, 'Rival', 'left')}
                {right && seatTag(right.seat, right.name, 'Rival', 'right')}

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
                        {t.plays.map((p, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <CardView card={p.card} small />
                            <small className="muted">{playerName(room, p.seat)}</small>
                          </div>
                        ))}
                        {t.plays.length === 0 && <CardBack />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isSpectator && (
                <div style={{ marginTop: 10 }}>
                  <h4 style={{ marginBottom: 6 }}>Tus cartas {mySeat !== null && `(asiento ${mySeat})`}</h4>
                  <div className="row">
                    {(hand.myCards ?? []).map((c) => (
                      <CardView key={c.id} card={c} playable={myTurn} onPlay={() => socket.emit('playCard', { cardId: c.id })} />
                    ))}
                    {(hand.myCards ?? []).length === 0 && <span className="muted">Sin cartas en mano.</span>}
                  </div>
                </div>
              )}

              <div className="canto-bar" style={{ marginTop: 10 }}>
                {trucoPendingForMe && (
                  <div className="row">
                    <strong>Te cantaron {hand.truco.level}:</strong>
                    <button className="btn btn-green btn-sm" onClick={() => socket.emit('respondTruco', { quiero: true })}>Quiero</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => socket.emit('respondTruco', { quiero: false })}>No quiero</button>
                  </div>
                )}
                {envidoPendingForMe && (
                  <div className="row">
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
                  <button className="btn btn-green btn-sm" onClick={() => socket.emit('nextHand')}>Siguiente mano →</button>
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
    </div>
  );
}
