# Matoyvoy MVP — Diseño (Truco 1v1 + salas)

Fecha: 2026-09-10. Estado: implementado y verificado E2E.

## Objetivo
Base solida para Truco Argentino online 1v1 en salas privadas, extensible a 2v2 y a reglas Matoyvoy futuras. Sin login/ranking/persistencia.

## Arquitectura
Monorepo npm workspaces: `packages/game-core` (puro, sin sockets/UI, reutilizable offline/bot), `apps/server` (autoritativo, Socket.IO, memoria), `apps/web` (React+Vite simple responsive). `apps/server` sirve `apps/web/dist` en produccion (un solo servicio Render).

## Modelo
- `Player {id,nombre,asiento,equipo,conectado}` en coleccion (no player1/2). Asientos 0,2=A / 1,3=B. MVP usa 0,1.
- `Room {codigo,host,jugadores,espectadores,estado,partida}`. Estado: lobby/playing/finished.
- `Match {scores, targetScore(15 default), handNumber, currentHand}`. `Hand {manos, trucos, turnos, truco, envido}`. `Trick {lead, plays, winner}`.

## Reglas MVP
Envido un canto/mano (2/3/falta=lo que falta, NQ=1, solo 1ra baza). Truco 2/3/4 (NQ 1/2/3). Sin Flor. Mejor de 3 con pardas argentinas. Sale la mano, lidera ganador (parda: anterior). Cualquiera puede cantar (fiel al truco real). Turno restaurado via `turnBefore`.

## Seguridad
Server decide cartas/turnos/ganadores/puntos. Vista privada solo `myCards` propios; espectador `[]`. Verificado E2E sin leak.

## Sockets
`createRoom/joinRoom/rejoin/leaveRoom/startGame/playCard/singTruco/respondTruco/singEnvido/respondEnvido/nextHand/backToLobby` -> `roomState` personalizado + `errorMsg` + `credentials`. Token por jugador para refresh. Host migra. Abandono en partida cierra sala como finished.

## UI
Home / Lobby / Mesa. Cartas = rectangulos (`CardView` reemplazable). Puntajes, turno, cantos, log. CSS simple responsive.

## Tests
31 unitarios (jerarquia, bazas, manos, truco, envido, turnos) + E2E sockets (privacidad, mano completa, nextHand, rejoin, partida a 4).
