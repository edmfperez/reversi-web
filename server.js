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

let players = {};

function serverLog(...messages) {
  io.emit('log', '**** Message from the server: \n' + messages.join(' '));
  messages.forEach(message => console.log(message));
}

io.on('connection', (socket) => {
  serverLog('A page connected to the server:', socket.id);

  socket.on('join_room', (payload) => {
    serverLog('Server received join room command:', JSON.stringify(payload));

    if (!payload) {
      const response = {
        result: 'fail',
        message: 'Client did not send a payload'
      };
      socket.emit('join_room_response', response);
      return;
    }

    const { room, username } = payload;
    if (!room) {
      const response = {
        result: 'fail',
        message: 'Client did not send a valid room to join'
      };
      socket.emit('join_room_response', response);
      return;
    }

    if (!username) {
      const response = {
        result: 'fail',
        message: 'Client did not send a valid username'
      };
      socket.emit('join_room_response', response);
      return;
    }

    socket.join(room);
    players[socket.id] = { id: socket.id, username, room };

    const sockets = Array.from(io.sockets.adapter.rooms.get(room) || []);
    serverLog(`There are ${sockets.length} clients in the room ${room}`);
    if (!sockets.includes(socket.id)) {
      const response = {
        result: 'fail',
        message: 'Server internal error joining chat room'
      };
      socket.emit('join_room_response', response);
      return;
    }

    const response = {
      result: 'success',
      room: room,
      username: username,
      count: sockets.length,
      players: Object.values(players).filter(player => player.room === room)
    };
    io.in(room).emit('join_room_response', response);
    serverLog('Join room succeeded:', JSON.stringify(response));
  });

  socket.on('invite_player', (payload) => {
    serverLog('Server received invite player command:', JSON.stringify(payload));
    // Handle invite player logic here
  });

  socket.on('disconnect', () => {
    serverLog('A page disconnected from the server:', socket.id);
    if (players[socket.id]) {
      const { username, room } = players[socket.id];
      delete players[socket.id];

      const payload = {
        username,
        room,
        count: Object.keys(players).filter(id => players[id].room === room).length,
        socket_id: socket.id
      };

      io.in(room).emit('player_disconnected', payload);
      serverLog('Player disconnected:', JSON.stringify(payload));
    }
  });

  socket.on('chat message', (data) => {
    serverLog('Server received chat message:', JSON.stringify(data));

    if (!data || !data.room || !data.username || !data.message) {
      return;
    }

    const response = {
      result: 'success',
      room: data.room,
      username: data.username,
      message: data.message
    };
    io.in(data.room).emit('chat message', response);
    serverLog('Chat message broadcast:', JSON.stringify(response));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));