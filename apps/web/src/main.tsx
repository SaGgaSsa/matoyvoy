import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSocket, loadCredentials, clearCredentials } from './socket';
import type { RoomStatePayload } from './gameTypes';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { TableScreen } from './screens/TableScreen';
import './styles.css';

function App(): React.ReactElement {
  const [state, setState] = useState<RoomStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejoinTried, setRejoinTried] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onState = (payload: RoomStatePayload): void => {
      setState(payload);
      setError(null);
    };
    const onErr = (p: { message: string }): void => setError(p.message);
    const onCred = (c: { code: string; playerId: string; token: string }): void => {
      // credentials ya guardadas en Home; nada extra
    };
    s.on('roomState', onState);
    s.on('errorMsg', onErr);
    s.on('credentials', onCred);
    s.on('connect', () => {
      if (!rejoinTried) {
        setRejoinTried(true);
        const cred = loadCredentials();
        if (cred) s.emit('rejoin', cred, (res: any) => {
          if (!res?.ok) clearCredentials();
        });
      }
    });
    // Si ya estaba conectado (hot reload), intentar rejoin igual
    if (s.connected && !rejoinTried) {
      setRejoinTried(true);
      const cred = loadCredentials();
      if (cred) s.emit('rejoin', cred, (res: any) => {
        if (!res?.ok) clearCredentials();
      });
    }
    return () => {
      s.off('roomState', onState);
      s.off('errorMsg', onErr);
      s.off('credentials', onCred);
    };
  }, [rejoinTried]);

  return (
    <div className="app">
      <div className="ambient" />
      {error && (
        <div className="error" onClick={() => setError(null)}>
          {error} (toca para cerrar)
        </div>
      )}
      {!state && <HomeScreen onError={setError} />}
      {state && state.room.status === 'lobby' && <LobbyScreen state={state} />}
      {state && state.room.status !== 'lobby' && <TableScreen state={state} />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
