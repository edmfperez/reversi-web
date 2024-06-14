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
const games = {};

// Create a new game object
function createNewGame() {
  const newGame = {
    player_white: {
      socket: '',
      username: ''
    },
    player_black: {
      socket: '',
      username: ''
    },
    last_move_time: new Date().getTime(),
    whose_turn: 'white',
    board: [
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', 'W', 'B', ' ', ' ', ' '],
      [' ', ' ', ' ', 'B', 'W', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ]
  };
  return newGame;
}

function sendGameUpdate(socket, gameId, message) {
  if (!games[gameId]) {
    console.log(`No game exists with game_id: ${gameId}. Creating a new game.`);
    games[gameId] = createNewGame();
  }

  const payload = {
    result: 'success',
    game_id: gameId,
    game: games[gameId],
    message: message
  };

  io.in(gameId).emit('game_update', payload);
}

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

    if (payload.room !== 'lobby') {
      sendGameUpdate(socket, payload.room, 'A new player has joined the game.');
    }
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
    if (!payload || !payload.to) {
      console.log('Invite command failed', payload);
      return;
    }

    const requestedUser = payload.to;
    const room = players[socket.id].room;
    const username = players[socket.id].username;

    if (!requestedUser || !players[requestedUser] || players[requestedUser].room !== room) {
      console.log('Invite command failed', payload);
      return;
    }

    const response = {
      result: 'success',
      game_id: room
    };

    io.to(requestedUser).emit('invited', { result: 'success', socket_id: socket.id });
    socket.emit('invite_response', response);
  });

  socket.on('uninvite', (payload) => {
    if (!payload || !payload.to) {
      console.log('Uninvite command failed', payload);
      return;
    }

    const requestedUser = payload.to;
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

  socket.on('accept_invite', (payload) => {
    if (!payload || !payload.to) {
      console.log('Accept invite command failed', payload);
      return;
    }

    const requestedUser = payload.to;
    const room = players[socket.id].room;

    if (!requestedUser || !players[requestedUser] || players[requestedUser].room !== room) {
      console.log('Accept invite command failed', payload);
      return;
    }

    const response = {
      result: 'success',
      game_id: room
    };

    socket.emit('game_start_response', response);
    io.to(requestedUser).emit('game_start_response', response);
  });

  socket.on('play_token', (data) => {
    const gameId = data.room;
    const game = games[gameId];
    if (!game) return;

    const { row, col, color } = data;
    game.board[row][col] = color;

    const { whiteCount, blackCount } = getScore(game.board);

    const response = {
      game: {
        board: game.board,
        whiteCount,
        blackCount
      },
      gameOver: whiteCount + blackCount === 64
    };

    io.in(gameId).emit('game_update', response);

    if (response.gameOver) {
      io.in(gameId).emit('game_over', { message: 'Game Over' });
    }
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

function getScore(board) {
  let whiteCount = 0;
  let blackCount = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === 'W') whiteCount++;
      if (board[row][col] === 'B') blackCount++;
    }
  }
  return { whiteCount, blackCount };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
