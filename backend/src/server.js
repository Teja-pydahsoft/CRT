const http = require('http');
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/database');
const initSocketIO = require('./sockets/socket');

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = initSocketIO(server, env.CORS_ORIGINS);
  app.set('io', io);

  const PORT = env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`🚀 VERSANT Node.js Backend Server running on port ${PORT} [Env: ${env.NODE_ENV}]`);
    console.log(`🔗 Health check available at http://localhost:${PORT}/health`);
  });
}

startServer();
