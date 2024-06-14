// Initialize Socket.IO client
const socket = io();

const params = new URLSearchParams(window.location.search);
let username = decodeURI(params.get('username'));
let chatRoom = params.get('game_id') || 'lobby';

if (!username || username === 'null' || username === '') {
  username = 'Guest';
}

document.getElementById('username-display').innerText = `Welcome, ${username}`;

let myColor;
let board = Array(8).fill().map(() => Array(8).fill('?'));

$(document).ready(() => {
  $('#lobby-title').text(`${username}'s Lobby`);

  const request = {
    room: chatRoom,
    username: username
  };
  console.log('Client log message: Sending join room command', JSON.stringify(request));
  socket.emit('join_room', request);

  $('#chat-input').keypress(function(event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      $('#send-button').click();
    }
  });

  $('#quit').click(() => {
    socket.emit('quit_game', { username, room: chatRoom });
    window.location.href = `lobby.html?username=${username}`;
  });

  if (chatRoom !== 'lobby') {
    createBoard();
  }
});

function createBoard() {
  const boardElement = $('#game-board');
  boardElement.empty();
  for (let row = 0; row < 8; row++) {
    const tr = $('<tr></tr>');
    for (let col = 0; col < 8; col++) {
      const td = $(`<td id="cell_${row}_${col}"></td>`);
      td.append(`<img src="assets/images/empty.gif" class="image-fluid" alt="empty">`);
      td.click(() => playToken(row, col));
      tr.append(td);
    }
    boardElement.append(tr);
  }
}

function playToken(row, col) {
  const request = {
    room: chatRoom,
    username: username,
    row: row,
    col: col,
    color: myColor
  };
  console.log('Client log message: Sending play token command', JSON.stringify(request));
  socket.emit('play_token', request);
}

function updateBoard(newBoard) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = $(`#cell_${row}_${col}`);
      cell.find('img').removeClass('black white');
      if (newBoard[row][col] === 'B') {
        cell.find('img').attr('src', 'assets/images/empty_to_black.gif').addClass('black');
      } else if (newBoard[row][col] === 'W') {
        cell.find('img').attr('src', 'assets/images/empty_to_white.gif').addClass('white');
      } else {
        cell.find('img').attr('src', 'assets/images/empty.gif');
      }
    }
  }
  board = newBoard;
}

function sendChatMessage() {
  const message = $('#chat-input').val();
  const request = {
    room: chatRoom,
    username: username,
    message: message
  };
  console.log('Client log message: Sending chat message', JSON.stringify(request));
  socket.emit('chat message', request);
  $('#chat-input').val('');
}

function invitePlayer(playerId) {
  const request = {
    room: chatRoom,
    from: username,
    to: playerId
  };
  console.log('Client log message: Sending invite player command', JSON.stringify(request));
  socket.emit('invite', request);
}

function makePlayButton(socketId) {
  const newNode = $('<button class="btn btn-success">Play</button>');

  newNode.click(() => {
    const payload = {
      room: chatRoom,
      from: username,
      to: socketId
    };
    console.log('Client log message: Sending game start command', JSON.stringify(payload));
    socket.emit('game_start', payload);
  });

  $(`.socket_${socketId} button`).replaceWith(newNode);
}

function makeInviteButton(socketId) {
  const newNode = $('<button class="btn btn-outline-primary">Invite</button>');

  newNode.click(() => {
    const payload = {
      requested_user: socketId
    };
    console.log('Client log message: Sending invite command', JSON.stringify(payload));
    socket.emit('invite', payload);
  });

  $(`.socket_${socketId} button`).replaceWith(newNode);
}

function makeInvitedButton(socketId) {
  const newNode = $('<button class="btn btn-primary">Invited</button>');

  newNode.click(() => {
    const payload = {
      requested_user: socketId
    };
    console.log('Client log message: Sending uninvite command', JSON.stringify(payload));
    socket.emit('uninvite', payload);
  });

  $(`.socket_${socketId} button`).replaceWith(newNode);
}

socket.on('log', (message) => {
  console.log(message);
});

socket.on('join_room_response', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  const domElements = $(`.socket_${payload.socket_id}`);
  if (domElements.length !== 0) {
    return;
  }

  const newPlayerDiv = `
    <div class="row align-items-center socket_${payload.socket_id}" style="display:none;">
      <div class="col text-end"><h4>${payload.username}</h4></div>
      <div class="col text-start"><button class="btn btn-outline-primary" onclick="invitePlayer('${payload.socket_id}')">Invite</button></div>
    </div>
  `;
  $('#players').append($(newPlayerDiv).fadeIn(500));

  const newMessage = `<p class="join-room-response">${payload.username} joined the ${payload.room}. There are ${payload.count} users in this room.</p>`;
  const newNode = $(newMessage).hide();
  $('#chat-messages').prepend(newNode);
  newNode.fadeIn(500);

  $('#players').empty();
  payload.players.forEach(player => {
    const playerDiv = `<div class="player socket_${player.id}">
      ${player.username} <button class="invite-btn" onclick="invitePlayer('${player.id}')">Invite</button>
    </div>`;
    $('#players').append(playerDiv);
  });
});

socket.on('chat message', (data) => {
  const messageElement = $(`<div>${data.username}: ${data.message}</div>`).hide();
  $('#chat-messages').append(messageElement);
  messageElement.fadeIn(500);
});

socket.on('player_disconnected', (payload) => {
  const newString = `<p class="left-room-response">${payload.username} left the ${payload.room}. There are ${payload.count} users in this room.</p>`;
  const newNode = $(newString).hide();
  $('#chat-messages').prepend(newNode);
  newNode.fadeIn(500);

  const domElements = $(`.socket_${payload.socket_id}`);
  if (domElements.length !== 0) {
    domElements.fadeOut(500, () => domElements.remove());
  }
});

socket.on('invite_response', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  makeInvitedButton(payload.socket_id);
});

socket.on('invited', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  makePlayButton(payload.socket_id);
});

socket.on('uninvited', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  makeInviteButton(payload.socket_id);
});

// Handle game start response
socket.on('game_start_response', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  // Navigate to the game page with the correct game_id
  window.location.href = `game.html?username=${username}&game_id=${payload.game_id}`;
});

socket.on('game_update', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  updateBoard(payload.game.board);
  $('#white-score').text(payload.game.whiteCount);
  $('#black-score').text(payload.game.blackCount);

  if (payload.gameOver) {
    $('#game-over').text('Game Over');
    alert('Game Over!');
  }
});

socket.on('assign_color', (payload) => {
  if (!payload) {
      console.log('Server did not send a payload');
      return;
  }

  myColor = payload.color;
  console.log(`Assigned color: ${myColor}`); // Debug statement

  const colorElement = document.getElementById('my-color');
  if (colorElement) {
      console.log('Updating color element'); // Debug statement
      colorElement.innerText = `Your color: ${myColor}`;
      console.log(`Updated color element to: ${colorElement.innerText}`); // Debug statement
  } else {
      console.log('Color element not found'); // Debug statement
  }
});


socket.on('game_update', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  const board = payload.game.board;

  if (typeof board === 'undefined' || board === null) {
    console.log('Server did not send a valid board to display');
    return;
  }

  const oldBoard = Array(8).fill().map(() => Array(8).fill('?'));

  const t = Date.now();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (oldBoard[row][col] !== board[row][col]) {
        let graphic = '';
        let altTag = '';

        if (oldBoard[row][col] === '?' && board[row][col] === ' ') {
          graphic = 'empty.gif';
          altTag = 'empty space';
        } else if (oldBoard[row][col] === '?' && board[row][col] === 'W') {
          graphic = 'empty_to_white.gif';
          altTag = 'white token';
        } else if (oldBoard[row][col] === '?' && board[row][col] === 'B') {
          graphic = 'empty_to_black.gif';
          altTag = 'black token';
        } else if (oldBoard[row][col] === ' ' && board[row][col] === 'W') {
          graphic = 'empty_to_white.gif';
          altTag = 'white token';
        } else if (oldBoard[row][col] === ' ' && board[row][col] === 'B') {
          graphic = 'empty_to_black.gif';
          altTag = 'black token';
        } else if (oldBoard[row][col] === 'W' && board[row][col] === ' ') {
          graphic = 'white_to_empty.gif';
          altTag = 'empty space';
        } else if (oldBoard[row][col] === 'B' && board[row][col] === ' ') {
          graphic = 'black_to_empty.gif';
          altTag = 'empty space';
        } else if (oldBoard[row][col] === 'W' && board[row][col] === 'B') {
          graphic = 'white_to_black.gif';
          altTag = 'black token';
        } else if (oldBoard[row][col] === 'B' && board[row][col] === 'W') {
          graphic = 'black_to_white.gif';
          altTag = 'white token';
        } else {
          graphic = 'error.gif';
          altTag = 'error';
        }

        const cell = $(`#cell_${row}_${col}`);
        cell.html(`<img src="assets/images/${graphic}?time=${t}" class="image-fluid" alt="${altTag}">`);
      }
    }
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      oldBoard[row][col] = board[row][col];
    }
  }
});
