const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const players = {};

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  socket.on('join_room', (payload) => {
    if (!payload || !payload.room || !payload.username) {
      console.log('Join room command failed', payload);
      return;
    }

    players[socket.id] = {
      username: payload.username,
      room: payload.room
    };

    socket.join(payload.room);
    const roomPlayers = Object.keys(players).filter(id => players[id].room === payload.room);
    const response = {
      result: 'success',
      socket_id: socket.id,
      username: payload.username,
      room: payload.room,
      count: roomPlayers.length,
      players: roomPlayers.map(id => ({ id, username: players[id].username }))
    };

    io.in(payload.room).emit('join_room_response', response);
  });

  socket.on('chat message', (data) => {
    const response = {
      username: data.username,
      message: data.message,
      room: data.room
    };
    io.in(data.room).emit('chat message', response);
  });

  socket.on('invite', (payload) => {
    if (!payload || !payload.requested_user) {
      console.log('Invite command failed', payload);
      return;
    }

    const requestedUser = payload.requested_user;
    const room = players[socket.id].room;
    const username = players[socket.id].username;

    if (!requestedUser || !players[requestedUser] || players[requestedUser].room !== room) {
      console.log('Invite command failed', payload);
      return;
    }

    const response = {
      result: 'success',
      socket_id: requestedUser
    };

    socket.emit('invite_response', response);
    io.to(requestedUser).emit('invited', { result: 'success', socket_id: socket.id });
  });

  socket.on('uninvite', (payload) => {
    if (!payload || !payload.requested_user) {
      console.log('Uninvite command failed', payload);
      return;
    }

    const requestedUser = payload.requested_user;
    const room = players[socket.id].room;
    const username = players[socket.id].username;

    if (!requestedUser || !players[requestedUser] || players[requestedUser].room !== room) {
      console.log('Uninvite command failed', payload);
      return;
    }

    const response = {
      result: 'success',
      socket_id: requestedUser
    };

    socket.emit('uninvited', response);
    io.to(requestedUser).emit('uninvited', { result: 'success', socket_id: socket.id });
  });

  socket.on('game_start', (payload) => {
    if (!payload || !payload.requested_user) {
      console.log('Game start command failed', payload);
      return;
    }

    const requestedUser = payload.requested_user;
    const room = players[socket.id].room;
    const username = players[socket.id].username;

    if (!requestedUser || !players[requestedUser] || players[requestedUser].room !== room) {
      console.log('Game start command failed', payload);
      return;
    }

    const gameId = Math.floor(1 + Math.random() * 0x100000).toString(16).substr(1);
    const response = {
      result: 'success',
      game_id: gameId
    };

    socket.emit('game_start_response', response);
    io.to(requestedUser).emit('game_start_response', response);
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      const room = player.room;
      delete players[socket.id];
      const roomPlayers = Object.keys(players).filter(id => players[id].room === room);
      const response = {
        username: player.username,
        room: room,
        count: roomPlayers.length
      };

      io.in(room).emit('player_disconnected', response);
    }
    console.log('User disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
