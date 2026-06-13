const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbInitializer = require('./config/dbInitializer');
const initSockets = require('./socket');

// Route Imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/game');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: '*', // For local development, allow all origins. Adapt to React client URI for production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Bind API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Base route for sanity checking
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Socket.io initialization
const io = socketIo(server, {
  cors: corsOptions
});
initSockets(io);

// Start Server after DB sync
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await dbInitializer();
    server.listen(PORT, () => {
      console.log(`Ultimate Multiplayer Gaming Hub server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
