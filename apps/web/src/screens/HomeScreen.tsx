import React, { useEffect, useState } from 'react';
import { getSocket, saveCredentials } from '../socket';
import { Logo } from '../components/Logo';

export function HomeScreen({ onError }: { onError: (m: string) => void }): React.ReactElement {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [asSpectator, setAsSpectator] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState('Mesa Porteña de los Viernes');
  const [targetScore, setTargetScore] = useState(15);
  const [offlineTarget, setOfflineTarget] = useState(15);
  const [busy, setBusy] = useState(false);
  const [liveRooms, setLiveRooms] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.rooms === 'number') setLiveRooms(j.rooms);
      })
      .catch(() => undefined);
  }, []);

  const create = (): void => {
    if (!name.trim()) return onError('Elegí tu nombre primero');
    setBusy(true);
    getSocket().emit(
      'createRoom',
      { playerName: name.trim(), targetScore, roomName: roomName.trim() },
      (res: any) => {
        setBusy(false);
        if (!res?.ok) return onError(res?.message ?? 'No se pudo crear');
        saveCredentials({ code: res.code, playerId: res.playerId, token: res.token });
      },
    );
  };

  const createVsBot = (): void => {
    if (!name.trim()) return onError('Elegí tu nombre primero');
    setBusy(true);
    getSocket().emit(
      'createRoom',
      { playerName: name.trim(), targetScore: offlineTarget, roomName: 'Práctica vs Máquina', vsBot: true },
      (res: any) => {
        setBusy(false);
        if (!res?.ok) return onError(res?.message ?? 'No se pudo crear');
        saveCredentials({ code: res.code, playerId: res.playerId, token: res.token });
      },
    );
  };

  const join = (): void => {
    if (!name.trim()) return onError('Elegí un nombre');
    if (!code.trim()) return onError('Ingresá el código de mesa');
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
    <div>
      <div className="brand" style={{ margin: '8px 0 4px' }}>
        <Logo />
      </div>

      <div className="hero" style={{ margin: '12px 0' }}>
        <div className="pill"><span className="dot" />{liveRooms === null ? 'Salón de truco' : `${liveRooms} mesa${liveRooms === 1 ? '' : 's'} activas en este momento`}</div>
        <h1 style={{ marginTop: 8 }}>Salón de Truco</h1>
        <p className="muted">Creá tu propia mesa reglamentaria en segundos o sumate con el código de invitación de tus amigos.</p>
      </div>

      <div className="field" style={{ maxWidth: 340 }}>
        <label>Tu nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Nacho_Truquero" maxLength={20} />
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="card-opt">
          <h3>🃏 Armar Mesa Nueva</h3>
          <p className="muted" style={{ margin: 0 }}>1v1, a 15 o 30 puntos, sin flor. Mesa privada con código.</p>
          <button className="btn btn-brass" onClick={() => setShowModal(true)}>＋ Crear mesa</button>
        </div>
        <div className="card-opt">
          <h3>🎟️ Entrar con código</h3>
          <div className="field">
            <label>Código de mesa</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD" maxLength={6} />
          </div>
          <label className="check">
            <input type="checkbox" checked={asSpectator} onChange={(e) => setAsSpectator(e.target.checked)} />
            Entrar como espectador
          </label>
          <button className="btn btn-green" onClick={join} disabled={busy}>Entrar</button>
        </div>
      </div>

      <div className="card-opt" style={{ marginTop: 12 }}>
        <h3>🤖 Practicar offline — 1 vs La Máquina</h3>
        <p className="muted" style={{ margin: 0 }}>La misma mesa de siempre, pero tu rival es la máquina. El nivel se sortea al azar (fácil / medio / difícil).</p>
        <div className="row" style={{ marginTop: 8 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Límite de puntos</label>
            <div className="toggle-row">
              <button className={`toggle ${offlineTarget === 30 ? 'active-brass' : ''}`} onClick={() => setOfflineTarget(30)}>30 (Largo)</button>
              <button className={`toggle ${offlineTarget === 15 ? 'active-brass' : ''}`} onClick={() => setOfflineTarget(15)}>15 (Corto)</button>
            </div>
          </div>
          <button className="btn btn-brass" onClick={createVsBot} disabled={busy}>▶ Jugar vs máquina</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>🃏 Crear Mesa de Truco</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="muted" style={{ margin: '4px 0 12px' }}>Configuración oficial reglamentaria</p>

            <div className="field" style={{ marginBottom: 12 }}>
              <label>Nombre de la mesa</label>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Ej: Bodegón de San Telmo" maxLength={40} />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label>Formato de juego</label>
              <div className="opt-grid">
                <label className="opt selected">
                  <input type="radio" checked readOnly />
                  <span><strong>1 vs 1</strong><br /><small className="muted">Mano a mano</small></span>
                </label>
                <label className="opt disabled" title="Próximamente">
                  <input type="radio" disabled />
                  <span><strong>2 vs 2</strong><br /><small className="muted">Próximamente</small></span>
                </label>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Límite de puntos</label>
                <div className="toggle-row">
                  <button className={`toggle ${targetScore === 30 ? 'active-brass' : ''}`} onClick={() => setTargetScore(30)}>30 (Largo)</button>
                  <button className={`toggle ${targetScore === 15 ? 'active-brass' : ''}`} onClick={() => setTargetScore(15)}>15 (Corto)</button>
                </div>
              </div>
              <div className="field">
                <label>Regla de flor</label>
                <div className="toggle-row">
                  <button className="toggle" disabled title="Todavía no implementada">Con flor</button>
                  <button className="toggle active-green">Sin flor</button>
                </div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Acceso a la mesa</label>
              <div className="opt-grid">
                <label className="opt selected">
                  <input type="radio" checked readOnly />
                  <span>🔑 Privada con código</span>
                </label>
                <label className="opt disabled" title="Próximamente">
                  <input type="radio" disabled />
                  <span>Pública (próximamente)</span>
                </label>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-brass" onClick={create} disabled={busy}>✓ Abrir mesa ahora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
