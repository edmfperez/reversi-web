// Extract the username from the URL
const params = new URLSearchParams(window.location.search);
const username = decodeURI(params.get('username'))


// Display the username in the lobby
document.getElementById('username-display').innerText = `Welcome, ${username}`;

// Set up Socket.io
const socket = io();

// Handle server log messages
socket.on('log', (message) => {
  console.log(message);
});

// Handle sending messages
document.getElementById('send-button').addEventListener('click', () => {
  const message = document.getElementById('chat-input').value;
  socket.emit('chat message', { username, message });
  document.getElementById('chat-input').value = '';
});

// Handle receiving messages
socket.on('chat message', (data) => {
  const messageElement = document.createElement('div');
  messageElement.innerText = `${data.username}: ${data.message}`;
  document.getElementById('chat-messages').appendChild(messageElement);
});