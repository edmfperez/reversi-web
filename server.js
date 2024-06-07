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

  socket.on('disconnect', () => {
    serverLog('A page disconnected from the server:', socket.id);
  });

  // Handle receiving chat messages
  socket.on('chat message', (data) => {
    io.emit('chat message', data); // Broadcast the chat message to all clients
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));