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

// Function to log messages from the server and broadcast them to clients
function serverLog(...messages) {
  io.emit('log', '**** Message from the server: \n' + messages.join(' '));
  messages.forEach(message => console.log(message));
}

// Setup Socket.io connection handling
io.on('connection', (socket) => {
  serverLog('A page connected to the server:', socket.id);

  socket.on('join_room', (payload) => {
    serverLog('Server received join room command:', JSON.stringify(payload));

    if (typeof payload === 'undefined' || payload === null) {
      const response = {
        result: 'fail',
        message: 'Client did not send a payload'
      };
      socket.emit('join_room_response', response);
      return;
    }

    const { room, username } = payload;
    if (typeof room === 'undefined' || room === null) {
      const response = {
        result: 'fail',
        message: 'Client did not send a valid room to join'
      };
      socket.emit('join_room_response', response);
      return;
    }

    if (typeof username === 'undefined' || username === null) {
      const response = {
        result: 'fail',
        message: 'Client did not send a valid username'
      };
      socket.emit('join_room_response', response);
      return;
    }

    socket.join(room);
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
      count: sockets.length
    };
    io.in(room).emit('join_room_response', response);
    serverLog('Join room succeeded:', JSON.stringify(response));
  });

  socket.on('disconnect', () => {
    serverLog('A page disconnected from the server:', socket.id);
  });

  // Handle chat messages
  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));