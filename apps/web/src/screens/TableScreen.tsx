import React from 'react';
import { getSocket, clearCredentials } from '../socket';
import type { RoomStatePayload } from '../gameTypes';
import { CardView, CardBack } from '../components/CardView';

function playerName(room: RoomStatePayload['room'], seat: number | null): string {
  if (seat === null || seat === undefined) return '—';
  const p = room.players.find((x) => x.seat === seat);
  return p ? `${p.name}${p.connected ? '' : ' (off)'}` : `Asiento ${seat}`;
}

export function TableScreen({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, match, hand, mySeat, myRole, isHost, log } = state;
  const socket = getSocket();
  const isSpectator = myRole === 'spectator';
  const myTurn = hand && hand.turnSeat === mySeat && !hand.finished;

  const trucoPendingForMe =
    hand && hand.truco.pending && hand.truco.pendingTo === mySeat;
  const envidoPendingForMe =
    hand && hand.envido.pending && hand.envido.pendingTo === mySeat;

  const canSingTruco =
    hand && !hand.finished && !hand.truco.pending && !hand.envido.pending && !isSpectator;
  const canSingEnvido =
    hand &&
    !hand.finished &&
    !hand.envido.done &&
    !hand.truco.pending &&
    !hand.envido.pending &&
    hand.currentTrickIndex === 0 &&
    hand.truco.level === 'none' &&
    !isSpectator;

  const nextTrucoLabel =
    !hand ? 'Truco'
    : hand.truco.level === 'none' ? 'Truco'
    : hand.truco.level === 'truco' ? 'Retruco'
    : hand.truco.level === 'retruco' ? 'Vale cuatro'
    : 'Truco';

  return (
    <div className="table-wrap">
      <header className="topbar">
        <strong>Sala {room.code}</strong>
        <span>
          A: {match?.scores.A ?? 0} — B: {match?.scores.B ?? 0} (a {match?.targetScore ?? 15})
        </span>
        <span>{room.status === 'finished' ? 'Terminada' : `Mano ${match?.handNumber ?? '-'}`}</span>
      </header>

      {match?.finished && (
        <div className="panel">
          <h2>Gano el equipo {match.winnerTeam}</h2>
          <div className="row">
            {isHost && (
              <button onClick={() => socket.emit('backToLobby')}>Volver al lobby</button>
            )}
            <button className="secondary" onClick={() => { socket.emit('leaveRoom'); clearCredentials(); window.location.reload(); }}>
              Salir
            </button>
          </div>
        </div>
      )}

      {hand && (
        <>
          <div className="scores">
            <div>Turno: {hand.turnSeat === null ? (hand.finished ? '—' : 'esperando respuesta…') : playerName(room, hand.turnSeat)}</div>
            <div>Mano: {playerName(room, hand.manoSeat)} · Se juega por {hand.pointsAtStakeTruco} pt</div>
            {hand.finished && hand.winnerSeat !== null && (
              <div>Gano la mano {playerName(room, hand.winnerSeat)} (+{hand.pointsAtStakeTruco})</div>
            )}
          </div>

          <div className="tricks">
            {hand.tricks.map((t) => (
              <div key={t.number} className="trick">
                <div className="muted">Baza {t.number + 1} {t.winnerSeat !== null ? (t.winnerSeat === 'tie' ? '(parda)' : `(gana ${playerName(room, t.winnerSeat as number)})`) : ''}</div>
                <div className="row">
                  {t.plays.map((p, i) => (
                    <div key={i} className="played">
                      <div className="muted">{playerName(room, p.seat)}</div>
                      <CardView card={p.card} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hands">
            <div className="hand-row">
              <h4>Tus cartas {mySeat !== null ? `(asiento ${mySeat})` : ''}</h4>
              <div className="row">
                {(hand.myCards ?? []).map((c) => (
                  <CardView
                    key={c.id}
                    card={c}
                    playable={Boolean(myTurn) && !isSpectator}
                    onPlay={() => socket.emit('playCard', { cardId: c.id })}
                  />
                ))}
                {(hand.myCards ?? []).length === 0 && <span className="muted">Sin cartas (espectador o mano terminada)</span>}
              </div>
            </div>
            <div className="hand-row">
              <h4>Rivales / mesa</h4>
              <div className="row">
                {room.players
                  .filter((p) => p.seat !== mySeat)
                  .map((p) => (
                    <div key={p.id}>
                      <div className="muted">{p.name} ({hand.handCounts[p.seat] ?? 0} cartas)</div>
                      <div className="row">
                        {Array.from({ length: hand.handCounts[p.seat] ?? 0 }).map((_, i) => (
                          <CardBack key={i} />
                        ))}
                      </div>
                      <div className="muted">
                        Jugadas: {(hand.played[p.seat] ?? []).map((c) => c.id).join(', ') || '—'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="cantos">
            {trucoPendingForMe && (
              <div className="box warn">
                <strong>Te cantaron {hand.truco.level}. </strong>
                <div className="row">
                  <button onClick={() => socket.emit('respondTruco', { quiero: true })}>Quiero</button>
                  <button onClick={() => socket.emit('respondTruco', { quiero: false })}>No quiero</button>
                </div>
              </div>
            )}
            {envidoPendingForMe && (
              <div className="box warn">
                <strong>Te cantaron {hand.envido.level}. </strong>
                <div className="row">
                  <button onClick={() => socket.emit('respondEnvido', { quiero: true })}>Quiero</button>
                  <button onClick={() => socket.emit('respondEnvido', { quiero: false })}>No quiero</button>
                </div>
              </div>
            )}
            {!hand.finished && !hand.truco.pending && !hand.envido.pending && !isSpectator && (
              <div className="row">
                {canSingTruco && (
                  <button onClick={() => socket.emit('singTruco', {})}>{nextTrucoLabel}</button>
                )}
                {canSingEnvido && (
                  <>
                    <button onClick={() => socket.emit('singEnvido', { level: 'envido' })}>Envido</button>
                    <button onClick={() => socket.emit('singEnvido', { level: 'real_envido' })}>Real Envido</button>
                    <button onClick={() => socket.emit('singEnvido', { level: 'falta_envido' })}>Falta Envido</button>
                  </>
                )}
              </div>
            )}
            {hand.finished && !match?.finished && (
              <div className="row">
                <button onClick={() => socket.emit('nextHand')}>Siguiente mano</button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel log">
        <h4>Mensajes</h4>
        <ul>
          {(hand?.log ?? []).slice(-12).map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        <details>
          <summary>Log de partida</summary>
          <ul>
            {log.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
        <div className="row">
          <button className="secondary" onClick={() => { socket.emit('leaveRoom'); clearCredentials(); window.location.reload(); }}>
            Salir de la sala
          </button>
        </div>
      </div>
    </div>
  );
}
