const { Server } = require('socket.io');

function initSocketIO(server, corsOrigins) {
  const io = new Server(server, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join', (data) => {
      const room = data.room || data.user_id || data.role;
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    socket.on('module_access_changed', (data) => {
      io.to(data.student_id).emit('module_access_changed', data);
    });

    socket.on('exam_monitoring', (data) => {
      io.to('admin').emit('cheating_alert', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocketIO;
