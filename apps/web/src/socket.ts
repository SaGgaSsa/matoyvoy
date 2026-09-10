import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
    socket = io(url, { autoConnect: true });
  }
  return socket;
}

export interface Credentials {
  code: string;
  playerId: string;
  token: string;
}

const KEY = 'matoyvoy-credentials';

export function saveCredentials(c: Credentials): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch { /* noop */ }
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
