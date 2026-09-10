import React, { useState } from 'react';
import { getSocket, clearCredentials } from '../socket';
import type { RoomStatePayload } from '../gameTypes';
import { Logo } from '../components/Logo';

export function LobbyScreen({ state }: { state: RoomStatePayload }): React.ReactElement {
  const { room, isHost, myRole } = state;
  const [copied, setCopied] = useState(false);

  const start = (): void => {
    getSocket().emit('startGame', { targetScore: room.targetScore });
  };
  const leave = (): void => {
    getSocket().emit('leaveRoom');
    clearCredentials();
    window.location.reload();
  };
  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="brand" style={{ margin: '8px 0' }}>
        <Logo height={34} />
      </div>
      <div className="panel brass">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="pill"><span className="dot" />Mesa privada</div>
            <h2 style={{ marginTop: 6 }}>{room.name || `Mesa ${room.code}`}</h2>
            <p className="muted" style={{ margin: '4px 0' }}>
              Código <strong style={{ color: 'var(--secondary)', fontSize: '1.2em', letterSpacing: '2px' }}>{room.code}</strong>
              {' '}· a {room.targetScore} puntos · {myRole === 'spectator' ? 'entrás como espectador' : 'entrás como jugador'}
              {isHost ? ' · sos el host' : ''}
              {room.botDifficulty ? ` · rival máquina (nivel ${room.botDifficulty}, al azar)` : ''}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={copyCode}>{copied ? '✓ ¡Copiado!' : '⧉ Copiar código'}</button>
        </div>

        <h3 style={{ marginTop: 12 }}>Jugadores ({room.players.length}/2)</h3>
        <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
          {room.players.map((p) => (
            <li key={p.id} style={{ marginBottom: 4 }}>
              <span className="avatar" style={{ display: 'inline-flex', width: 26, height: 26, fontSize: '0.7em', verticalAlign: 'middle', marginRight: 6 }}>
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              {p.name} — asiento {p.seat} / equipo {p.team} — {p.connected ? 'conectado' : 'desconectado'}
              {p.isBot ? ' 🤖 (máquina)' : ''}
              {room.hostId === p.id ? ' (host)' : ''}
            </li>
          ))}
        </ul>
        <h3>Espectadores ({room.spectators.length})</h3>
        <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
          {room.spectators.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
          {room.spectators.length === 0 && <li className="muted">Nadie mirando todavía.</li>}
        </ul>

        <div className="row" style={{ marginTop: 12 }}>
          {isHost && (
            <button className="btn btn-brass" onClick={start} disabled={room.players.length < 2}>
              Iniciar partida 1v1
            </button>
          )}
          <button className="btn btn-ghost" onClick={leave}>Salir</button>
        </div>
        {room.players.length < 2 && <p className="muted">Esperando rival… compartile el código.</p>}
      </div>
    </div>
  );
}
