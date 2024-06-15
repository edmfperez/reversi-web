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

function createNewGame() {
  const initialBoard = [
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', 'W', 'B', ' ', ' ', ' '],
    [' ', ' ', ' ', 'B', 'W', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
  ];

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
    whose_turn: 'black', // Black starts first
    board: initialBoard,
    legal_moves: calculateLegalMoves('black', initialBoard) // Calculate initial legal moves
  };
  return newGame;
}

function calculateLegalMoves(player, board) {
  const legalMoves = Array(8).fill().map(() => Array(8).fill(' '));

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === ' ') {
        if (adjacentSupport(player, -1, -1, row, col, board) || // NW
            adjacentSupport(player, -1, 0, row, col, board) ||  // N
            adjacentSupport(player, -1, 1, row, col, board) ||  // NE
            adjacentSupport(player, 0, -1, row, col, board) ||  // W
            adjacentSupport(player, 0, 1, row, col, board) ||   // E
            adjacentSupport(player, 1, -1, row, col, board) ||  // SW
            adjacentSupport(player, 1, 0, row, col, board) ||   // S
            adjacentSupport(player, 1, 1, row, col, board)) {   // SE
          legalMoves[row][col] = player;
        }
      }
    }
  }

  return legalMoves;
}

function sendGameUpdate(socket, gameId, message) {
  if (!games[gameId]) {
    console.log(`No game exists with game_id: ${gameId}. Creating a new game.`);
    games[gameId] = createNewGame();
  }

  const game = games[gameId];
  const validMoves = calculateLegalMoves(game.whose_turn, game.board);

  let whiteSum = 0;
  let blackSum = 0;
  let legalMovesCount = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (game.legal_moves[row][col] !== ' ') {
        legalMovesCount++;
      }
      if (game.board[row][col] === 'W') {
        whiteSum++;
      }
      if (game.board[row][col] === 'B') {
        blackSum++;
      }
    }
  }

  let gameOver = false;
  let winner = 'tie';

  if (legalMovesCount === 0) {
    gameOver = true;
    if (whiteSum > blackSum) {
      winner = 'white';
    } else if (blackSum > whiteSum) {
      winner = 'black';
    }
  }

  const payload = {
    result: 'success',
    game_id: gameId,
    game: games[gameId],
    message: message,
    validMoves: validMoves,
    gameOver: gameOver,
    winner: winner,
    last_move_time: game.last_move_time // Add this line
  };

  io.in(gameId).emit('game_update', payload);

  if (gameOver) {
    io.in(gameId).emit('game_over', { message: `Game Over. ${winner === 'tie' ? 'It\'s a tie!' : `${winner} wins!`}` });
  }
}

function isPlayerTurn(game, socketId, color) {
  if (color === 'white' && game.player_white.socket === socketId && game.whose_turn === 'white') {
    return true;
  }
  if (color === 'black' && game.player_black.socket === socketId && game.whose_turn === 'black') {
    return true;
  }
  return false;
}

function adjacentSupport(player, dRow, dCol, row, col, board) {
  const opponent = (player === 'white') ? 'black' : 'white';

  const newRow = row + dRow;
  const newCol = col + dCol;

  if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) {
    return false;
  }

  if (board[newRow][newCol] !== opponent) {
    return false;
  }

  return checkLineMatch(player, dRow, dCol, newRow, newCol, board);
}

function checkLineMatch(player, dRow, dCol, row, col, board) {
  let newRow = row + dRow;
  let newCol = col + dCol;

  while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
    if (board[newRow][newCol] === ' ') {
      return false;
    }

    if (board[newRow][newCol] === player) {
      return true;
    }

    newRow += dRow;
    newCol += dc;
  }

  return false;
}

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

const flipTokens = (who, row, column, board) => {
  flipLine(who, -1, -1, row, column, board); // Northwest
  flipLine(who, -1, 0, row, column, board);  // North
  flipLine(who, -1, 1, row, column, board);  // Northeast
  flipLine(who, 0, -1, row, column, board);  // West
  flipLine(who, 0, 1, row, column, board);   // East
  flipLine(who, 1, -1, row, column, board);  // Southwest
  flipLine(who, 1, 0, row, column, board);   // South
  flipLine(who, 1, 1, row, column, board);   // Southeast
};

const flipLine = (who, dr, dc, row, column, board) => {
  const other = who === 'B' ? 'W' : 'B';
  let r = row + dr;
  let c = column + dc;
  let tokensToFlip = [];

  while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === other) {
    tokensToFlip.push([r, c]);
    r += dr;
    c += dc;
  }

  if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === who) {
    tokensToFlip.forEach(([r, c]) => {
      board[r][c] = who;
    });
  }
};

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

  socket.on('game_start', (payload) => {
    if (!payload || !payload.room || !payload.from || !payload.to) {
        console.log('Game start command failed', payload);
        return;
    }

    const room = payload.room;
    const from = payload.from;
    const to = payload.to;

    // Create a new game ID if needed
    const gameId = Math.floor(1 + Math.random() * 0x100000).toString(16).substr(1);
    games[gameId] = createNewGame();

    const response = {
        result: 'success',
        game_id: gameId
    };

    // Assign colors to players
    games[gameId].player_white.socket = from;
    games[gameId].player_black.socket = to;
    io.to(from).emit('assign_color', { color: 'white' });
    io.to(to).emit('assign_color', { color: 'black' });

    // Notify both players of the game start
    io.to(to).emit('game_start_response', response);
    socket.emit('game_start_response', response);
  });

  socket.on('play_token', (data) => {
    const gameId = data.room;
    const game = games[gameId];
    if (!game) return;

    if (!isPlayerTurn(game, socket.id, data.color)) {
      const response = {
        result: 'fail',
        message: 'Play token played the wrong color. It\'s not their turn.'
      };
      socket.emit('play_token_response', response);
      return;
    }

    const { row, col, color } = data;
    game.board[row][col] = color;

    // Flip tokens after a move is made
    flipTokens(color, row, col, game.board);

    // Toggle turn
    game.whose_turn = (color === 'white') ? 'black' : 'white';

    // Calculate legal moves for the next player
    game.legal_moves = calculateLegalMoves(game.whose_turn, game.board);

    // Update last move time
    game.last_move_time = new Date().getTime(); // Add this line

    const { whiteCount, blackCount } = getScore(game.board);

    // Check if game is over
    let gameOver = false;
    let winner = 'tie';
    let legalMovesCount = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (game.legal_moves[row][col] !== ' ') {
          legalMovesCount++;
        }
      }
    }

    if (legalMovesCount === 0) {
      gameOver = true;
      if (whiteCount > blackCount) {
        winner = 'white';
      } else if (blackCount > whiteCount) {
        winner = 'black';
      }
    }

    const response = {
      game: {
        board: game.board,
        whiteCount,
        blackCount,
        whose_turn: game.whose_turn,
        legal_moves: game.legal_moves
      },
      gameOver: gameOver,
      winner: winner
    };

    io.in(gameId).emit('game_update', response);

    if (gameOver) {
      io.in(gameId).emit('game_over', { message: `Game Over. ${winner === 'tie' ? 'It\'s a tie!' : `${winner} wins!`}` });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
