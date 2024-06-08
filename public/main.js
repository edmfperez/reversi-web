// Extract the username from the URL
const params = new URLSearchParams(window.location.search);
const username = decodeURI(params.get('username'));

// Display the username in the lobby
document.getElementById('username-display').innerText = `Welcome, ${username}`;

const chatRoom = 'lobby';

// Set up Socket.io
const socket = io();

$(document).ready(() => {
  const request = {
    room: chatRoom,
    username: username
  };
  console.log('Client log message: Sending join room command', JSON.stringify(request));
  socket.emit('join_room', request);
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
  $('#messages').prepend(newString);

  // Update players list
  $('#players').empty();
  payload.players.forEach(player => {
    const playerDiv = `<div class="player" id="${player.id}">${player.username} <button class="invite-btn" onclick="invitePlayer('${player.id}')">Invite</button></div>`;
    $('#players').append(playerDiv);
  });
});

function invitePlayer(playerId) {
  const request = {
    room: chatRoom,
    from: username,
    to: playerId
  };
  console.log('Client log message: Sending invite player command', JSON.stringify(request));
  socket.emit('invite_player', request);
}

// Handle receiving messages
socket.on('chat message', (data) => {
  const messageElement = document.createElement('div');
  messageElement.innerText = `${data.username}: ${data.message}`;
  document.getElementById('chat-messages').appendChild(messageElement);
});