import type { Server } from 'socket.io';
import {
  decideBotAction,
  playCard as corePlayCard,
  singTruco as coreSingTruco,
  respondTruco as coreRespondTruco,
  singEnvido as coreSingEnvido,
  respondEnvido as coreRespondEnvido,
  maxScore,
} from '@matoyvoy/game-core';
import { ensurePlaying } from './rooms.js';
import type { ServerRoom } from './views.js';

// Driver de la maquina (salas vs bot). decideBotAction() es puro y testeado;
// este modulo solo lo ejecuta con demora humana y re-emite el estado.
export function maybeBotMove(io: Server, room: ServerRoom, emit: (r: ServerRoom) => void): void {
  if (!room.botDifficulty) return;
  const match = room.match;
  if (!match || match.state.finished) return;
  const hand = match.state.currentHand;
  if (!hand || hand.finished) return;
  const bot = room.players.find((p) => p.isBot);
  if (!bot || !bot.connected) return;

  const action = decideBotAction(hand, bot.seat, room.botDifficulty, Math.random);
  if (!action) return;
  if (room.botTimer) return; // ya hay una movida programada
  const handId = hand.id;

  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    try {
      const m = ensurePlaying(room);
      const h = m.state.currentHand;
      if (!h || h.id !== handId || h.finished || m.state.finished) return;
      const again = decideBotAction(h, bot.seat, room.botDifficulty!, Math.random);
      if (!again) return;
      executeBotAction(room, again);
      if (m.state.finished) room.status = 'finished';
      emit(room);
    } catch {
      // Si la sala cerro o el estado cambio, no hacer nada.
    }
  }, 700 + Math.random() * 800);
}

function executeBotAction(
  room: ServerRoom,
  action: NonNullable<ReturnType<typeof decideBotAction>>,
): void {
  const match = ensurePlaying(room);
  const hand = match.state.currentHand;
  if (!hand) throw new Error('No hay mano en curso');
  const bot = room.players.find((p) => p.isBot);
  if (!bot) throw new Error('No hay bot en la sala');
  const seat = bot.seat;

  switch (action.type) {
    case 'play':
      corePlayCard(hand, seat, action.cardId);
      if (hand.finished) match.applyClosedHand();
      break;
    case 'singTruco':
      coreSingTruco(hand, seat);
      break;
    case 'respondTruco':
      coreRespondTruco(hand, seat, action.quiero);
      if (hand.finished) match.applyClosedHand();
      break;
    case 'singEnvido':
      coreSingEnvido(hand, seat, action.level);
      break;
    case 'respondEnvido':
      coreRespondEnvido(hand, seat, action.quiero, maxScore(match.state.scores), match.state.config.targetScore);
      match.applyEnvidoPoints();
      break;
  }
}
