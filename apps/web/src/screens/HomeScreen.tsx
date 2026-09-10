import React, { useState } from 'react';
import { getSocket, saveCredentials } from '../socket';

export function HomeScreen({ onError }: { onError: (m: string) => void }): React.ReactElement {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [asSpectator, setAsSpectator] = useState(false);
  const [targetScore, setTargetScore] = useState(15);
  const [busy, setBusy] = useState(false);

  const create = (): void => {
    if (!name.trim()) return onError('Elegi un nombre');
    setBusy(true);
    getSocket().emit('createRoom', { playerName: name.trim(), targetScore }, (res: any) => {
      setBusy(false);
      if (!res?.ok) return onError(res?.message ?? 'No se pudo crear');
      saveCredentials({ code: res.code, playerId: res.playerId, token: res.token });
    });
  };

  const join = (): void => {
    if (!name.trim()) return onError('Elegi un nombre');
    if (!code.trim()) return onError('Ingresa el codigo de sala');
    setBusy(true);
    getSocket().emit(
      'joinRoom',
      { code: code.trim().toUpperCase(), playerName: name.trim(), asSpectator },
      (res: any) => {
        setBusy(false);
        if (!res?.ok) return onError(res?.message ?? 'No se pudo entrar');
        saveCredentials({ code: res.code, playerId: res.playerId, token: res.token });
      },
    );
  };

  return (
    <div className="panel">
      <h1>Matoyvoy — Truco Argentino</h1>
      <p className="muted">MVP: salas privadas 1v1. Sin login. Codigo corto para compartir.</p>
      <label>
        Tu nombre
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan" maxLength={20} />
      </label>
      <div className="row">
        <div className="box">
          <h3>Crear sala</h3>
          <label>
            Puntos
            <select value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))}>
              <option value={15}>15</option>
              <option value={30}>30</option>
            </select>
          </label>
          <button onClick={create} disabled={busy}>Crear sala</button>
        </div>
        <div className="box">
          <h3>Entrar con codigo</h3>
          <label>
            Codigo
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD" maxLength={6} />
          </label>
          <label className="check">
            <input type="checkbox" checked={asSpectator} onChange={(e) => setAsSpectator(e.target.checked)} />
            Entrar como espectador
          </label>
          <button onClick={join} disabled={busy}>Entrar</button>
        </div>
      </div>
    </div>
  );
}
