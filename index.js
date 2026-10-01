const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  socket.on('join_room', ({ roomId, playerName }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        mines: {},
        likes: {}
      };
    }

    const existingPlayer = rooms[roomId].players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      rooms[roomId].players.push({
        id: socket.id,
        name: playerName || 'Игрок',
        score: 0
      });
    }

    io.to(roomId).emit('update_room_state', rooms[roomId]);
  });

  socket.on('submit_mine', ({ roomId, mineWord }) => {
    if (rooms[roomId]) {
      rooms[roomId].mines[socket.id] = mineWord.trim().toLowerCase();
      io.to(roomId).emit('mine_received', {
        minerId: socket.id,
        count: Object.keys(rooms[roomId].mines).length
      });
    }
  });

  socket.on('game_event', ({ roomId, eventType, data }) => {
    io.to(roomId).emit('on_game_event', { eventType, data });
  });

  socket.on('like_mine', ({ roomId, targetMinerId }) => {
    if (rooms[roomId]) {
      if (!rooms[roomId].likes[targetMinerId]) {
        rooms[roomId].likes[targetMinerId] = 0;
      }
      rooms[roomId].likes[targetMinerId] += 1;
      io.to(roomId).emit('update_likes', rooms[roomId].likes);
    }
  });

  socket.on('disconnect', () => {
    console.log('Игрок отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
