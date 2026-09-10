import type { Server } from 'socket.io';
import type { ServerRoom } from './views.js';

// Punto de enganche del driver del bot (partidas vs maquina).
// ESTRUCTURA SOLAMENTE: decideBotAction() aun devuelve null porque la
// logica de juego no esta implementada, asi que esto es un no-op.
// Cuando se implemente la logica, este hook ejecutara la accion del bot
// (jugar carta / responder o cantar truco-envido / pedir siguiente mano)
// con una pequeña demora, y re-emitira el estado.
export function maybeBotMove(_io: Server, _room: ServerRoom): void {
  return;
}
