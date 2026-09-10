import type { Server } from 'socket.io';
import type { BotDifficulty, Seat } from '@matoyvoy/game-core';
import {
  playCard as corePlayCard,
  singTruco as coreSingTruco,
  respondTruco as coreRespondTruco,
  singEnvido as coreSingEnvido,
  respondEnvido as coreRespondEnvido,
  maxScore,
} from '@matoyvoy/game-core';
import {
  getRoom,
  createRoom,
  joinAsPlayer,
  joinAsSpectator,
  attachSocket,
  rejoinWithToken,
  handleDisconnect,
  leaveRoom,
  startMatch,
  ensurePlaying,
  socketMembership,
} from './rooms.js';
import { publicRoomView, publicMatchView, publicHandView, privateHandView } from './views.js';
import { maybeBotMove } from './bot.js';
import type { ServerRoom } from './views.js';

function seatOf(room: ServerRoom, playerId: string): Seat | null {
  const p = room.players.find((x) => x.id === playerId);
  return p ? p.seat : null;
}

export function emitRoomState(io: Server, room: ServerRoom): void {
  const base = publicRoomView(room);
  const matchPub = publicMatchView(room);
  const handPub = publicHandView(room.match?.state.currentHand ?? null);
  const matchLog = room.match?.state.log.slice(-30) ?? [];

  const targets: { socketId: string | null; seat: Seat | null; role: string; id: string }[] = [
    ...room.players.map((p) => ({
      socketId: p.socketId,
      seat: p.seat as Seat | null,
      role: 'player',
      id: p.id,
    })),
    ...room.spectators.map((s) => ({
      socketId: s.socketId,
      seat: null as Seat | null,
      role: 'spectator',
      id: s.id,
    })),
  ];

  for (const t of targets) {
    if (!t.socketId) continue;
    const handPriv =
      t.seat !== null
        ? privateHandView(room.match?.state.currentHand ?? null, t.seat)
        : handPub
          ? { ...handPub, myCards: [], mySeat: null as Seat | null }
          : null;
    io.to(t.socketId).emit('roomState', {
      room: base,
      match: matchPub,
      handPublic: handPub,
      hand: handPriv,
      mySeat: t.seat,
      myRole: t.role,
      myId: t.id,
      isHost: base.hostId === t.id,
      log: matchLog,
    });
  }
  // Hook del bot: ejecuta la movida pendiente (si hay) con demora humana.
  maybeBotMove(io, room, (r) => emitRoomState(io, r));
}

function emitError(io: Server, socketId: string, message: string): void {
  io.to(socketId).emit('errorMsg', { message });
}

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.emit('connected', { socketId: socket.id });

    socket.on('createRoom', (payload: { playerName: string; targetScore?: number; roomName?: string; vsBot?: boolean; difficulty?: BotDifficulty }, ack?: (res: any) => void) => {
      try {
        const name = String(payload?.playerName ?? '').trim() || 'Jugador';
        const target = Number(payload?.targetScore) || 15;
        const roomName = String(payload?.roomName ?? '').trim();
        const vsBot = Boolean(payload?.vsBot);
        const difficulty = typeof payload?.difficulty === 'string' ? (payload.difficulty as BotDifficulty) : undefined;
        const { room, player } = createRoom(name, target, roomName, { vsBot, difficulty });
        attachSocket(room, 'player', player.id, socket.id);
        socket.join(room.code);
        const res = { code: room.code, playerId: player.id, token: player.token };
        if (ack) ack({ ok: true, ...res });
        socket.emit('credentials', res);
        emitRoomState(io, room);
      } catch (e: any) {
        const msg = e?.message ?? 'Error al crear sala';
        if (ack) ack({ ok: false, message: msg });
        emitError(io, socket.id, msg);
      }
    });

    socket.on('joinRoom', (payload: { code: string; playerName: string; asSpectator?: boolean }, ack?: (res: any) => void) => {
      try {
        const code = String(payload?.code ?? '').toUpperCase().trim();
        const name = String(payload?.playerName ?? '').trim() || 'Jugador';
        if (payload?.asSpectator) {
          const { room, spec } = joinAsSpectator(code, name);
          attachSocket(room, 'spectator', spec.id, socket.id);
          socket.join(room.code);
          const res = { code: room.code, playerId: spec.id, token: spec.token, role: 'spectator' };
          if (ack) ack({ ok: true, ...res });
          socket.emit('credentials', res);
          emitRoomState(io, room);
        } else {
          const { room, player } = joinAsPlayer(code, name);
          attachSocket(room, 'player', player.id, socket.id);
          socket.join(room.code);
          const res = { code: room.code, playerId: player.id, token: player.token, role: 'player' };
          if (ack) ack({ ok: true, ...res });
          socket.emit('credentials', res);
          emitRoomState(io, room);
        }
      } catch (e: any) {
        const msg = e?.message ?? 'Error al entrar a la sala';
        if (ack) ack({ ok: false, message: msg });
        emitError(io, socket.id, msg);
      }
    });

    socket.on('rejoin', (payload: { code: string; playerId: string; token: string }, ack?: (res: any) => void) => {
      try {
        const code = String(payload?.code ?? '').toUpperCase().trim();
        const { room } = rejoinWithToken(code, payload.playerId, payload.token, socket.id);
        socket.join(room.code);
        if (ack) ack({ ok: true, code: room.code });
        emitRoomState(io, room);
      } catch (e: any) {
        const msg = e?.message ?? 'No se pudo reconectar';
        if (ack) ack({ ok: false, message: msg });
        emitError(io, socket.id, msg);
      }
    });

    socket.on('leaveRoom', () => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return;
      socket.leave(mem.code);
      const room = leaveRoom(mem.code, mem.kind, mem.id);
      socketMembership.delete(socket.id);
      if (room) emitRoomState(io, room);
    });

    socket.on('startGame', (payload: { targetScore?: number }) => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return emitError(io, socket.id, 'No estas en una sala');
      const room = getRoom(mem.code);
      if (!room) return emitError(io, socket.id, 'Sala no encontrada');
      if (room.hostId !== mem.id) return emitError(io, socket.id, 'Solo el host puede iniciar');
      try {
        // En salas vs bot el match arranca sin repartir: el humano reparte cada mano.
        const hasBot = room.players.some((p) => p.isBot);
        startMatch(room, payload?.targetScore, { deal: !hasBot });
        emitRoomState(io, room);
      } catch (e: any) {
        emitError(io, socket.id, e?.message ?? 'No se pudo iniciar');
      }
    });

    const withPlayer = (fn: (room: ServerRoom, seat: Seat) => void) => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return emitError(io, socket.id, 'No estas en una sala');
      // Espectadores nunca pueden jugar
      if (mem.kind !== 'player') return emitError(io, socket.id, 'Los espectadores no pueden jugar');
      const room = getRoom(mem.code);
      if (!room) return emitError(io, socket.id, 'Sala no encontrada');
      const seat = seatOf(room, mem.id);
      if (seat === null) return emitError(io, socket.id, 'No sos jugador de esta sala');
      try {
        fn(room, seat);
        // Si el match termino, marcar sala terminada
        if (room.match?.state.finished) room.status = 'finished';
        emitRoomState(io, room);
      } catch (e: any) {
        emitError(io, socket.id, e?.message ?? 'Jugada invalida');
      }
    };

    socket.on('playCard', (payload: { cardId: string; faceDown?: boolean }) => {
      withPlayer((room, seat) => {
        const match = ensurePlaying(room);
        const hand = match.state.currentHand;
        if (!hand) throw new Error('No hay mano en curso');
        corePlayCard(hand, seat, String(payload?.cardId), { faceDown: Boolean(payload?.faceDown) });
        if (hand.finished) {
          match.applyClosedHand();
        }
      });
    });

    socket.on('singTruco', (payload: { level?: 'truco' | 'retruco' | 'vale_cuatro' }) => {
      withPlayer((room, seat) => {
        const match = ensurePlaying(room);
        const hand = match.state.currentHand;
        if (!hand) throw new Error('No hay mano en curso');
        coreSingTruco(hand, seat, (payload?.level as any) ?? undefined);
      });
    });

    socket.on('respondTruco', (payload: { quiero: boolean }) => {
      withPlayer((room, seat) => {
        const match = ensurePlaying(room);
        const hand = match.state.currentHand;
        if (!hand) throw new Error('No hay mano en curso');
        coreRespondTruco(hand, seat, Boolean(payload?.quiero));
        if (hand.finished) match.applyClosedHand();
      });
    });

    socket.on('singEnvido', (payload: { level?: 'envido' | 'real_envido' | 'falta_envido' }) => {
      withPlayer((room, seat) => {
        const match = ensurePlaying(room);
        const hand = match.state.currentHand;
        if (!hand) throw new Error('No hay mano en curso');
        coreSingEnvido(hand, seat, (payload?.level as any) ?? 'envido');
      });
    });

    socket.on('respondEnvido', (payload: { quiero: boolean }) => {
      withPlayer((room, seat) => {
        const match = ensurePlaying(room);
        const hand = match.state.currentHand;
        if (!hand) throw new Error('No hay mano en curso');
        coreRespondEnvido(hand, seat, Boolean(payload?.quiero), maxScore(match.state.scores), match.state.config.targetScore);
        match.applyEnvidoPoints();
      });
    });

    socket.on('dealHand', () => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return emitError(io, socket.id, 'No estas en una sala');
      const room = getRoom(mem.code);
      if (!room || !room.match) return emitError(io, socket.id, 'No hay partida');
      if (room.hostId !== mem.id) return emitError(io, socket.id, 'Solo el host puede repartir');
      if (!room.botDifficulty) return emitError(io, socket.id, 'El reparto manual es solo en modo maquina');
      try {
        const hand = room.match.state.currentHand;
        if (room.match.state.finished) throw new Error('La partida ya termino');
        if (hand && !hand.finished) throw new Error('Termina la mano actual primero');
        room.match.startNextHand();
        room.status = 'playing';
        emitRoomState(io, room);
      } catch (e: any) {
        emitError(io, socket.id, e?.message ?? 'No se pudo repartir');
      }
    });

    socket.on('nextHand', () => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return emitError(io, socket.id, 'No estas en una sala');
      const room = getRoom(mem.code);
      if (!room || !room.match) return emitError(io, socket.id, 'No hay partida');
      try {
        const hand = room.match.state.currentHand;
        if (!hand?.finished) throw new Error('La mano aun no termino');
        if (room.match.state.finished) {
          room.status = 'finished';
        } else {
          room.match.startNextHand();
          if (room.status === 'finished') room.status = 'playing'; // reanudar si se quiere seguir
        }
        emitRoomState(io, room);
      } catch (e: any) {
        emitError(io, socket.id, e?.message ?? 'No se pudo repartir');
      }
    });

    socket.on('backToLobby', () => {
      const mem = socketMembership.get(socket.id);
      if (!mem) return;
      const room = getRoom(mem.code);
      if (!room) return;
      if (room.hostId !== mem.id) return emitError(io, socket.id, 'Solo el host puede volver al lobby');
      room.status = 'lobby';
      room.match = null;
      emitRoomState(io, room);
    });

    socket.on('disconnect', () => {
      const room = handleDisconnect(socket.id);
      if (room) emitRoomState(io, room);
    });
  });
}
