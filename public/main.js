// main.js
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

// Handle receiving messages
socket.on('chat message', (data) => {
  const messageElement = document.createElement('div');
  messageElement.innerText = `${data.username}: ${data.message}`;
  document.getElementById('chat-messages').appendChild(messageElement);
});