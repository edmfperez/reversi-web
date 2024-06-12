const params = new URLSearchParams(window.location.search);
let username = decodeURI(params.get('username'));
let chatRoom = params.get('game_id') || 'lobby';

if (!username || username === 'null') {
  username = 'Guest';
}

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
  $('#chat-input').val('');
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

  if (payload.socket_id === socket.id) {
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