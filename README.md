# Matoyvoy — Truco Argentino online (MVP)

Base solida, simple y extensible para partidas privadas de Truco Argentino 1v1.
Sin Matoyvoy todavia: primero Truco funcionando + infraestructura de salas.

## Estructura

- `packages/game-core`: motor puro de Truco (sin sockets ni UI). Usable offline vs bot a futuro.
  - `cards.ts`: mazo español 40, barajado, reparto
  - `ranking.ts`: jerarquia argentina, ganador de baza, ganador de mano (pardas)
  - `envido.ts`: tanto y puntajes
  - `hand.ts`: maquina de mano (turnos, bazas, Truco/Retruco/Vale4, Envido/Real/Falta)
  - `match.ts`: partida a N puntos (default 15), cambio de mano, scores por equipo
  - Modelo preparado para 2v2: `seat 0,2 = A / 1,3 = B`. MVP usa 0 y 1.
- `apps/server`: Node + Express + Socket.IO, autoritativo, salas en memoria.
- `apps/web`: React + Vite, UI funcional simple y responsive.

## Reglas MVP (simplificaciones documentadas)

- Partidas a 15 (configurable 15/30).
- Envido: un solo canto por mano (Envido=2, Real=3, Falta=lo que falta). No Querido=1. Solo en primera baza. Cualquiera puede cantar.
- Truco: Truco=2, Retruco=3, Vale4=4. No Querido: 1/2/3 al cantor. Cualquiera puede cantar/subir en cualquier momento (como en truco real).
- Sin Flor.
- Mano: mejor de 3 con pardas argentinas (gana 2da si 1ra parda, gana 1ra si 2da parda, triple parda gana mano).
- Turno: sale la mano, luego lidera el ganador de baza (parda: lidera el anterior).

## Seguridad del estado

- El server es autoritativo: decide cartas, turnos, ganadores y puntos.
- Cada socket recibe `hand` privada (solo sus cartas) + `handPublic` general.
- Espectadores reciben `myCards: []` siempre. Nunca se envian manos ajenas.

## Desarrollo local

```bash
npm install
npm test                    # tests del motor
npm run dev:server          # :3001
npm run dev:web             # :5173 (proxea sockets a :3001)
```

Probar en dos navegadores/dispositivos:
1. Crear sala (nombre + puntos) -> codigo de 4 letras.
2. En otro navegador: ingresar codigo + nombre -> entra como jugador 2.
3. Host inicia partida.
4. Jugar mano completa (cartas, Truco, Envido), Siguiente mano, hasta 15.
5. Probar espectador con checkbox.

Refresh/reconexion: se guarda `{code, playerId, token}` en localStorage y se hace `rejoin` automatico. Desconexion marca `connected=false` sin romper la sala; host migra al siguiente jugador.

## Produccion / Render

- Un solo servicio: `apps/server` sirve `apps/web/dist`.
- `render.yaml` incluido: build `npm install && npm run build`, start `npm start`.
- Sin DB: las salas son en memoria y se pierden al reiniciar (esperado en MVP).

## Tests

```bash
npm run test --workspace=packages/game-core
```

Cubren: jerarquia, bazas, manos/pardas, truco (2/3/4 y rechazos), envido (tanto, querido/no, empate->mano), turnos y cambio de mano.
