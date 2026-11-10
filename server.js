'use strict';
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true } });
const lobbies = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

app.disable('x-powered-by');
app.get('/health', (_req, res) => res.json({ ok: true, game: 'Street Soccer 3D', lobbies: lobbies.size }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function makeCode() {
  let code;
  do { code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); }
  while (lobbies.has(code));
  return code;
}
function publicLobby(lobby) {
  return { code: lobby.code, hostId: lobby.hostId, players: [...lobby.players.values()].map(p => ({ id: p.id, name: p.name })) };
}
function updateLobby(lobby) {
  const snapshot = publicLobby(lobby);
  for (const id of lobby.players.keys()) io.to(id).emit('lobby-updated', snapshot);
}
function leaveLobby(socket) {
  const code = socket.data.lobbyCode;
  if (!code) return;
  const lobby = lobbies.get(code);
  socket.data.lobbyCode = null;
  if (!lobby) return;
  lobby.players.delete(socket.id);
  if (socket.id === lobby.hostId) {
    for (const id of lobby.players.keys()) io.to(id).emit('lobby-closed', { reason: 'The lobby host left. The room has closed.' });
    lobbies.delete(code);
  } else {
    updateLobby(lobby);
  }
  socket.leave(code);
}

io.on('connection', socket => {
  socket.on('create-lobby', (payload = {}, ack = () => {}) => {
    if (socket.data.lobbyCode) leaveLobby(socket);
    const code = makeCode();
    const lobby = { code, hostId: socket.id, players: new Map([[socket.id, { id: socket.id, name: String(payload.name || 'Host').slice(0, 24) }]]) };
    lobbies.set(code, lobby);
    socket.data.lobbyCode = code;
    socket.join(code);
    ack({ ok: true, lobby: publicLobby(lobby) });
    updateLobby(lobby);
  });

  socket.on('join-lobby', (payload = {}, ack = () => {}) => {
    const code = String(payload.code || '').toUpperCase().replace(/[^A-Z]/g, '');
    const lobby = lobbies.get(code);
    if (!lobby) return ack({ ok: false, error: 'Lobby not found. Check the room code.' });
    if (lobby.players.size >= 32) return ack({ ok: false, error: 'This lobby is full.' });
    if (socket.data.lobbyCode) leaveLobby(socket);
    lobby.players.set(socket.id, { id: socket.id, name: String(payload.name || 'Player').slice(0, 24) });
    socket.data.lobbyCode = code;
    socket.join(code);
    ack({ ok: true, lobby: publicLobby(lobby) });
    updateLobby(lobby);
  });

  socket.on('game-event', packet => {
    const code = socket.data.lobbyCode;
    const lobby = code && lobbies.get(code);
    if (!lobby || !packet || typeof packet.event !== 'string') return;
    const allowed = new Set(['hello', 'in', 'lob', 'go', 'match-end', 'st', 'pause', 'ev', 'pen-hello', 'pen-in', 'pen-st', 'pen-go', 'pen-full']);
    if (!allowed.has(packet.event)) return;
    // Game state and control packets are relayed only to members of the same room.
    socket.to(code).emit('game-event', { event: packet.event, data: packet.data, peer: socket.id });
  });

  socket.on('leave-lobby', (_payload, ack) => {
    leaveLobby(socket);
    if (typeof ack === 'function') ack({ ok: true });
  });
  socket.on('disconnect', () => leaveLobby(socket));
});

if (require.main === module) server.listen(PORT, () => console.log(`Street Soccer 3D server listening on port ${PORT}`));
module.exports = { app, server, io, lobbies };
