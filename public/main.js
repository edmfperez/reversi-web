// Extract the username from the URL
const params = new URLSearchParams(window.location.search);
let username = decodeURI(params.get('username'));
let chatRoom = params.get('game_id') || 'lobby';

if (!username || username === 'null') {
  username = 'Guest';
}

// Display the username in the lobby
document.getElementById('username-display').innerText = `Welcome, ${username}`;

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
});

function sendChatMessage() {
  const message = $('#chat-input').val();
  const request = {
    room: chatRoom,
    username: username,
    message: message
  };
  console.log('Client log message: Sending chat message', JSON.stringify(request));
  socket.emit('chat message', request);
  $('#chat-input').val(''); // Clear the input field
}

function invitePlayer(playerId) {
  const request = {
    room: chatRoom,
    from: username,
    to: playerId
  };
  console.log('Client log message: Sending invite player command', JSON.stringify(request));
  socket.emit('invite_player', request);
}

// Handle server log messages
socket.on('log', (message) => {
  console.log(message);
});

// Handle join room responses
socket.on('join_room_response', (payload) => {
  if (!payload) {
    console.log('Server did not send a payload');
    return;
  }

  if (payload.result === 'fail') {
    console.log(payload.message);
    return;
  }

  const newString = `<p class="join-room-response">${payload.username} joined the ${payload.room}. There are ${payload.count} users in this room.</p>`;
  const newNode = $(newString).hide();
  $('#messages').prepend(newNode);
  newNode.fadeIn(500);

  // Update players list
  $('#players').empty();
  payload.players.forEach(player => {
    const playerDiv = `<div class="player" id="${player.id}">${player.username} <button class="invite-btn" onclick="invitePlayer('${player.id}')">Invite</button></div>`;
    $('#players').append(playerDiv);
  });
});

// Handle receiving messages
socket.on('chat message', (data) => {
  const messageElement = $(`<div>${data.username}: ${data.message}</div>`).hide();
  $('#chat-messages').append(messageElement);
  messageElement.fadeIn(500);
});