import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket.js';
import { listRooms } from './rooms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: listRooms(), service: 'matoyvoy-server' });
});

// En produccion (Render) el server sirve el frontend compilado.
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ ok: true, msg: 'Matoyvoy server (dev: el frontend corre en Vite)' });
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

registerSocketHandlers(io);

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`[matoyvoy] server escuchando en :${PORT}`);
});
