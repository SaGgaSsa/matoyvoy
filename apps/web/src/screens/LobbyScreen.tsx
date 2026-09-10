import React from 'react';
import { getSocket, clearCredentials } from '../socket';
import type { RoomStatePayload } from '../gameTypes';

export function LobbyScreen({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, isHost, myRole } = state;

  const start = (): void => {
    getSocket().emit('startGame', { targetScore: room.targetScore });
  };
  const leave = (): void => {
    getSocket().emit('leaveRoom');
    clearCredentials();
    window.location.reload();
  };

  return (
    <div className="panel">
      <h2>Sala {room.code}</h2>
      <p className="muted">
        Comparti este codigo. {isHost ? 'Sos el host.' : ''} Entraste como {myRole === 'spectator' ? 'espectador' : 'jugador'}.
      </p>
      <h3>Jugadores ({room.players.length}/2)</h3>
      <ul>
        {room.players.map((p) => (
          <li key={p.id}>
            {p.name} — asiento {p.seat} / equipo {p.team} — {p.connected ? 'conectado' : 'desconectado'}
            {room.hostId === p.id ? ' (host)' : ''}
          </li>
        ))}
      </ul>
      <h3>Espectadores ({room.spectators.length})</h3>
      <ul>
        {room.spectators.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
      <div className="row">
        {isHost && <button onClick={start} disabled={room.players.length < 2}>Iniciar partida (1v1)</button>}
        <button className="secondary" onClick={leave}>Salir</button>
      </div>
      {room.players.length < 2 && <p className="muted">Esperando rival… MVP requiere 2 jugadores.</p>}
    </div>
  );
}
