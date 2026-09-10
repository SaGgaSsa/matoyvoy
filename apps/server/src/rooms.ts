import { v4 as uuid } from 'uuid';
import type { BotDifficulty, Player, Seat, Team } from '@matoyvoy/game-core';
import { BOT_DIFFICULTIES, Match, randomBotDifficulty, teamOfSeat } from '@matoyvoy/game-core';
import type { ServerRoom, ServerPlayer, ServerSpectator } from './views.js';

const rooms = new Map<string, ServerRoom>();
// socketId -> { code, kind, id }
export const socketMembership = new Map<string, { code: string; kind: 'player' | 'spectator'; id: string }>();

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(code)) return code;
  }
  return uuid().slice(0, 4).toUpperCase();
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function listRooms(): number {
  return rooms.size;
}

export interface CreateRoomOpts {
  vsBot?: boolean;
  difficulty?: BotDifficulty;
}

export function createRoom(
  playerName: string,
  targetScore = 15,
  roomName = '',
  opts: CreateRoomOpts = {},
): { room: ServerRoom; player: ServerPlayer } {
  const code = generateCode();
  const player: ServerPlayer = {
    id: uuid(),
    name: playerName.slice(0, 20) || 'Jugador',
    seat: 0,
    team: 'A',
    connected: true,
    token: uuid(),
    socketId: null,
  };
  const players = [player];
  let botDifficulty: BotDifficulty | null = null;
  if (opts.vsBot) {
    const d = opts.difficulty && (BOT_DIFFICULTIES as readonly string[]).includes(opts.difficulty)
      ? opts.difficulty
      : randomBotDifficulty();
    botDifficulty = d;
    players.push({
      id: uuid(),
      name: 'La Máquina',
      seat: 1,
      team: 'B',
      connected: true,
      isBot: true,
      token: uuid(),
      socketId: null,
    });
  }
  const room: ServerRoom = {
    code,
    name: roomName.slice(0, 40) || (opts.vsBot ? 'Práctica vs Máquina' : `Mesa ${code}`),
    hostId: player.id,
    players,
    spectators: [],
    status: 'lobby',
    targetScore,
    match: null,
    createdAt: Date.now(),
    botDifficulty,
  };
  rooms.set(code, room);
  return { room, player };
}

export function joinAsPlayer(code: string, playerName: string): { room: ServerRoom; player: ServerPlayer } {
  const room = getRoom(code);
  if (!room) throw new Error('Sala no encontrada');
  if (room.status !== 'lobby') throw new Error('La partida ya empezo (entra como espectador)');
  if (room.players.some((p) => p.isBot)) throw new Error('Sala vs máquina: no admite segundo jugador');
  if (room.players.length >= 2) throw new Error('Sala llena (MVP 1v1). Entra como espectador.');
  // Asientos MVP: 0 y 1. Modelo preparado para 0..3 (0,2 = A / 1,3 = B).
  const usedSeats = new Set(room.players.map((p) => p.seat));
  const seat: Seat = usedSeats.has(0) ? 1 : 0;
  const team: Team = teamOfSeat(seat);
  const player: ServerPlayer = {
    id: uuid(),
    name: playerName.slice(0, 20) || 'Jugador',
    seat,
    team,
    connected: true,
    token: uuid(),
    socketId: null,
  };
  room.players.push(player);
  return { room, player };
}

export function joinAsSpectator(code: string, name: string): { room: ServerRoom; spec: ServerSpectator } {
  const room = getRoom(code);
  if (!room) throw new Error('Sala no encontrada');
  const spec: ServerSpectator = {
    id: uuid(),
    name: name.slice(0, 20) || 'Espectador',
    token: uuid(),
    socketId: null,
  };
  room.spectators.push(spec);
  return { room, spec };
}

export function attachSocket(
  room: ServerRoom,
  kind: 'player' | 'spectator',
  id: string,
  socketId: string,
): void {
  if (kind === 'player') {
    const p = room.players.find((x) => x.id === id);
    if (!p) throw new Error('Jugador no pertenece a la sala');
    p.socketId = socketId;
    p.connected = true;
  } else {
    const s = room.spectators.find((x) => x.id === id);
    if (!s) throw new Error('Espectador no pertenece a la sala');
    s.socketId = socketId;
  }
  socketMembership.set(socketId, { code: room.code, kind, id });
}

export function rejoinWithToken(
  code: string,
  id: string,
  token: string,
  socketId: string,
): { room: ServerRoom; kind: 'player' | 'spectator' } {
  const room = getRoom(code);
  if (!room) throw new Error('Sala no encontrada (quizas el server se reinicio)');
  const p = room.players.find((x) => x.id === id);
  if (p) {
    if (p.token !== token) throw new Error('Token invalido');
    p.socketId = socketId;
    p.connected = true;
    socketMembership.set(socketId, { code: room.code, kind: 'player', id });
    return { room, kind: 'player' };
  }
  const s = room.spectators.find((x) => x.id === id);
  if (s) {
    if (s.token !== token) throw new Error('Token invalido');
    s.socketId = socketId;
    socketMembership.set(socketId, { code: room.code, kind: 'spectator', id });
    return { room, kind: 'spectator' };
  }
  throw new Error('No perteneces a esta sala');
}

export function handleDisconnect(socketId: string): ServerRoom | null {
  const mem = socketMembership.get(socketId);
  if (!mem) return null;
  socketMembership.delete(socketId);
  const room = getRoom(mem.code);
  if (!room) return null;
  if (mem.kind === 'player') {
    const p = room.players.find((x) => x.id === mem.id);
    if (p) {
      p.connected = false;
      p.socketId = null;
      // Migrar host si era el host
      if (room.hostId === p.id) {
        const next = room.players.find((x) => x.connected) ?? null;
        if (next) {
          room.hostId = next.id;
        } else {
          const spec = room.spectators[0];
          if (spec) room.hostId = spec.id;
        }
      }
    }
  } else {
    const s = room.spectators.find((x) => x.id === mem.id);
    if (s) s.socketId = null;
  }
  // Si nadie conectado, mantener la sala un rato (MVP: la dejamos; se pierde al reiniciar).
  // Limpieza oportunista: si no hay ningun conectado, no la borramos enseguida para permitir refresh.
  return room;
}

export function leaveRoom(code: string, kind: 'player' | 'spectator', id: string): ServerRoom | null {
  const room = getRoom(code);
  if (!room) return null;
  if (kind === 'player') {
    const idx = room.players.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [removed] = room.players.splice(idx, 1);
      if (removed?.socketId) socketMembership.delete(removed.socketId);
      // Si estaba en partida y queda 1 jugador, ese gana por abandono.
      if (room.status === 'playing' && room.match && room.players.length === 1) {
        room.status = 'finished';
        // No tocamos scores; el ganador es el equipo del que queda.
      } else if (room.players.length === 0 && room.spectators.length === 0) {
        rooms.delete(code);
        return null;
      }
      if (room.hostId === id) {
        const next = room.players[0] ?? room.spectators[0];
        if (next) room.hostId = next.id;
      }
      // Si vuelve a lobby por abandono, permitir reingreso: pasar a lobby si quedo 1 jugador y no termino match.
      if (room.status === 'playing' && room.players.length < 2 && room.match?.state.finished !== true) {
        // Mantener 'finished' por abandono para no dejar estado invalido.
        room.status = 'finished';
      }
    }
  } else {
    const idx = room.spectators.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [removed] = room.spectators.splice(idx, 1);
      if (removed?.socketId) socketMembership.delete(removed.socketId);
      if (room.players.length === 0 && room.spectators.length === 0) {
        rooms.delete(code);
        return null;
      }
    }
  }
  return room;
}

export function startMatch(room: ServerRoom, targetScore?: number, opts: { deal?: boolean } = {}): void {
  if (room.players.length < 2) throw new Error('Se necesitan 2 jugadores para iniciar (MVP 1v1)');
  const connected = room.players.filter((p) => p.connected);
  if (connected.length < 2) throw new Error('Ambos jugadores deben estar conectados');
  const t = targetScore ?? room.targetScore ?? 15;
  room.targetScore = t;
  const players: Player[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    team: p.team,
    connected: p.connected,
  }));
  const match = new Match({ targetScore: t, players });
  // En salas vs bot no se reparte al iniciar: el humano apreta Repartir cada mano.
  if (opts.deal ?? true) match.startNextHand();
  room.match = match;
  room.status = 'playing';
}

export function ensurePlaying(room: ServerRoom): Match {
  if (!room.match) throw new Error('No hay partida en esta sala');
  return room.match;
}
