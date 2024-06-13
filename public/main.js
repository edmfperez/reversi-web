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
let board = Array(8).fill().map(() => Array(8).fill(null));

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

  createBoard();
});

function createBoard() {
  const boardElement = $('#game-board');
  boardElement.empty();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = $('<div class="cell"></div>');
      cell.attr('id', `cell_${row}_${col}`);
      cell.click(() => playToken(row, col));
      boardElement.append(cell);
    }
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
      cell.removeClass('black white');
      if (newBoard[row][col] === 'black') {
        cell.addClass('black');
      } else if (newBoard[row][col] === 'white') {
        cell.addClass('white');
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

  if (payload.room !== chatRoom) return;

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

socket.on('game_start_response', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

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

  updateBoard(payload.board);
  $('#white-score').text(payload.whiteCount);
  $('#black-score').text(payload.blackCount);

  if (payload.gameOver) {
    $('#game-over').text('Game Over');
  }
});

socket.on('assign_color', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  myColor = payload.color;
  $('#my-color').text(`Your color: ${myColor}`);
});
