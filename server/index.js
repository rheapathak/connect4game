const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Game = require('./lib/game');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }, // in prod restrict origin
  maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 4000;

/*
 In-memory stores (replace with Redis for production)
 rooms: roomId -> room object {id, players: [socket.id,...], game: Game instance, ...}
 queue: array of sockets waiting for match
 players: socketId -> {name, roomId}
*/
const rooms = {};
const queue = [];
const players = {};

// --- Helper functions ---
function createRoom(playerSocket, opts = {}) {
  const roomId = uuidv4();
  const room = {
    id: roomId,
    players: [playerSocket.id],
    sockets: [playerSocket],
    createdAt: Date.now(),
    game: new Game(), // authoritative state
    rematchVotes: 0,
    chat: []
  };
  rooms[roomId] = room;
  players[playerSocket.id] = { name: opts.name || 'Player', roomId };
  playerSocket.join(roomId);
  return room;
}

function joinRoom(roomId, socket, opts = {}) {
  const room = rooms[roomId];
  if (!room) return null;
  if (room.players.length >= 2) return 'full';
  room.players.push(socket.id);
  room.sockets.push(socket);
  players[socket.id] = { name: opts.name || 'Player', roomId };
  socket.join(roomId);
  // start game when 2 players present
  room.game = new Game();
  return room;
}

function removeFromRoom(socket) {
  const p = players[socket.id];
  if (!p) return;
  const roomId = p.roomId;
  const room = rooms[roomId];
  if (!room) return;
  // remove socket/id
  room.players = room.players.filter(id => id !== socket.id);
  room.sockets = room.sockets.filter(s => s.id !== socket.id);
  socket.leave(roomId);
  delete players[socket.id];
  // if no players left, delete room
  if (room.players.length === 0) {
    delete rooms[roomId];
  } else {
    // notify remaining player
    io.to(roomId).emit('room_update', {
      message: 'Opponent left',
      roomId,
      players: room.players
    });
  }
}

// matchmaking
function tryMatchmake() {
  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();
    // create a room and join both
    const room = createRoom(a, { name: a.playerName || 'Player' });
    const joined = joinRoom(room.id, b, { name: b.playerName || 'Player' });
    // notify both
    io.to(room.id).emit('match_found', {
      roomId: room.id,
      players: room.players
    });
    // send initial game state
    broadcastGameState(room.id);
  }
}

function broadcastGameState(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit('game_state', {
    board: room.game.getBoard(),
    currentPlayerIndex: room.game.currentPlayerIndex,
    status: room.game.status,
    winner: room.game.winner, // null or 0/1
    roomId
  });
}

// --- Socket.IO events ---
io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('join_lobby', (payload = {}) => {
    socket.playerName = payload.name || 'Player';
    players[socket.id] = { name: socket.playerName, roomId: null };
    socket.emit('lobby_update', { message: 'joined lobby' });
  });

  socket.on('enter_queue', () => {
    if (!players[socket.id]) {
      players[socket.id] = { name: socket.playerName || 'Player', roomId: null };
    }
    if (!queue.find(s => s.id === socket.id)) {
      queue.push(socket);
      socket.emit('lobby_update', { message: 'queued' });
      tryMatchmake();
    }
  });

  socket.on('create_room', ({ name } = {}) => {
    const room = createRoom(socket, { name: name || socket.playerName });
    socket.emit('room_created', { roomId: room.id });
  });

  socket.on('join_room', ({ roomId, name } = {}) => {
    const res = joinRoom(roomId, socket, { name: name || socket.playerName });
    if (res === 'full') {
      socket.emit('error', { message: 'room full' });
    } else if (!res) {
      socket.emit('error', { message: 'room not found' });
    } else {
      // notify players
      io.to(roomId).emit('room_update', {
        message: 'player joined',
        players: rooms[roomId].players
      });
      broadcastGameState(roomId);
    }
  });

  socket.on('play_move', ({ column }) => {
    const p = players[socket.id];
    if (!p || !p.roomId) {
      socket.emit('invalid_move', { message: 'Not in a game' });
      return;
    }
    const room = rooms[p.roomId];
    if (!room) {
      socket.emit('invalid_move', { message: 'Room no longer exists' });
      return;
    }
    // determine player index (0 or 1)
    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) {
      socket.emit('invalid_move', { message: 'You are not in the room' });
      return;
    }
    // validate and apply move via Game instance
    const moveResult = room.game.play(playerIndex, column);
    if (!moveResult.ok) {
      socket.emit('invalid_move', { message: moveResult.message });
      return;
    }
    // broadcast new state
    broadcastGameState(room.id);

    // if game finished, flag
    if (room.game.status !== 'playing') {
      io.to(room.id).emit('game_over', {
        winner: room.game.winner,
        status: room.game.status
      });
    }
  });

  socket.on('request_rematch', () => {
    const p = players[socket.id];
    if (!p || !p.roomId) return;
    const room = rooms[p.roomId];
    if (!room) return;

    room.rematchVotes = (room.rematchVotes || 0) + 1;
    // if both players vote, reset game
    if (room.rematchVotes >= 2) {
      room.game = new Game();
      room.rematchVotes = 0;
      io.to(room.id).emit('rematch_started', { message: 'rematch started' });
      broadcastGameState(room.id);
    } else {
      io.to(room.id).emit('room_update', { message: 'rematch vote received' });
    }
  });

  socket.on('send_chat', ({ text }) => {
    const p = players[socket.id];
    if (!p || !p.roomId) return;
    const room = rooms[p.roomId];
    room.chat.push({ from: p.name, text, at: Date.now() });
    io.to(room.id).emit('chat', { from: p.name, text });
  });

  socket.on('leave', () => {
    removeFromRoom(socket);
    // remove from queue if present
    const idx = queue.findIndex(s => s.id === socket.id);
    if (idx !== -1) queue.splice(idx, 1);
    socket.disconnect();
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
    // clean up
    removeFromRoom(socket);
    const idx = queue.findIndex(s => s.id === socket.id);
    if (idx !== -1) queue.splice(idx, 1);
    delete players[socket.id];
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Connect4 server running' });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
