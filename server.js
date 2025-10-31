const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from Vue build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Store active rooms and their state
const rooms = new Map();

// Room structure:
// {
//   code: string,
//   host: socketId,
//   participants: Map<socketId, { id, name, color, cursor }>,
//   state: { js, html, css, history },
//   lastUpdate: timestamp
// }

// Generate a unique 6-character room code
function generateRoomCode() {
  return nanoid(6).toUpperCase();
}

// Generate a random color for each participant
function generateColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Clean up empty rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.participants.size === 0 && (now - room.lastUpdate > 3600000)) { // 1 hour
      rooms.delete(code);
      console.log(`Cleaned up empty room: ${code}`);
    }
  }
}, 300000); // Check every 5 minutes

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (data, callback) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      host: socket.id,
      participants: new Map(),
      state: data.state || { js: '', html: '', css: '' },
      lastUpdate: Date.now()
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    const participant = {
      id: socket.id,
      name: data.name || 'Anonymous',
      color: generateColor(),
      cursor: null
    };

    room.participants.set(socket.id, participant);

    console.log(`Room created: ${roomCode} by ${data.name}`);

    callback({
      success: true,
      roomCode: roomCode,
      participant: participant
    });

    // Notify others in room
    socket.to(roomCode).emit('participant-joined', participant);
  });

  // Join an existing room
  socket.on('join-room', (data, callback) => {
    const { roomCode, name } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      callback({
        success: false,
        message: 'Room not found. Please check the code.'
      });
      return;
    }

    socket.join(roomCode);

    const participant = {
      id: socket.id,
      name: name || 'Anonymous',
      color: generateColor(),
      cursor: null
    };

    room.participants.set(socket.id, participant);
    room.lastUpdate = Date.now();

    console.log(`${name} joined room: ${roomCode}`);

    callback({
      success: true,
      roomCode: roomCode,
      participant: participant,
      state: room.state,
      participants: Array.from(room.participants.values())
    });

    // Notify others in room
    socket.to(roomCode).emit('participant-joined', participant);
  });

  // Get room info
  socket.on('get-room-info', (roomCode, callback) => {
    const room = rooms.get(roomCode);
    if (room) {
      callback({
        success: true,
        participants: Array.from(room.participants.values()),
        isHost: room.host === socket.id
      });
    } else {
      callback({ success: false });
    }
  });

  // Handle code changes
  socket.on('code-change', (data) => {
    const { roomCode, editorType, content, cursorPosition } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      console.log(`Room not found: ${roomCode}`);
      return;
    }

    // Update room state
    if (editorType === 'js') {
      room.state.js = content;
    } else if (editorType === 'html') {
      room.state.html = content;
    } else if (editorType === 'css') {
      room.state.css = content;
    }

    room.lastUpdate = Date.now();

    // Update cursor position
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.cursor = { editorType, position: cursorPosition };
    }

    console.log(`Broadcasting ${editorType} change from ${participant?.name} to room ${roomCode} (${room.participants.size - 1} other users)`);

    // Broadcast to others in room (everyone except sender)
    socket.to(roomCode).emit('code-update', {
      editorType,
      content,
      userId: socket.id,
      cursorPosition
    });
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { roomCode, editorType, position } = data;
    const room = rooms.get(roomCode);

    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.cursor = { editorType, position };

      // Broadcast cursor position to others
      socket.to(roomCode).emit('cursor-update', {
        userId: socket.id,
        name: participant.name,
        color: participant.color,
        editorType,
        position
      });
    }
  });

  // Handle project changes
  socket.on('project-change', (data) => {
    const { roomCode, projectData } = data;
    const room = rooms.get(roomCode);

    if (!room) return;

    room.state = projectData;
    room.lastUpdate = Date.now();

    // Broadcast to others in room
    socket.to(roomCode).emit('project-update', {
      projectData,
      userId: socket.id
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove user from all rooms
    for (const [code, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        // Notify others
        socket.to(code).emit('participant-left', {
          userId: socket.id,
          name: participant.name
        });

        // If host left, assign new host
        if (room.host === socket.id && room.participants.size > 0) {
          const newHost = room.participants.keys().next().value;
          room.host = newHost;
          io.to(code).emit('new-host', { hostId: newHost });
        }

        console.log(`${participant.name} left room: ${code}`);
      }
    }
  });

  // Leave room explicitly
  socket.on('leave-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room && room.participants.has(socket.id)) {
      const participant = room.participants.get(socket.id);
      room.participants.delete(socket.id);
      socket.leave(roomCode);

      // Notify others
      socket.to(roomCode).emit('participant-left', {
        userId: socket.id,
        name: participant.name
      });

      // If host left, assign new host
      if (room.host === socket.id && room.participants.size > 0) {
        const newHost = room.participants.keys().next().value;
        room.host = newHost;
        io.to(roomCode).emit('new-host', { hostId: newHost });
      }
    }
  });
});

// API endpoint to check room status
app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code);
  if (room) {
    res.json({
      exists: true,
      participants: room.participants.size
    });
  } else {
    res.json({ exists: false });
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Serve the main page - all routes should serve the Vue app
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return;
  }
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
