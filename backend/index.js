/**
 * GitPilot Backend Server
 * Express server for Git workflow management and execution
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import services
const workflowRoutes = require('./routes/workflows');
const executionRoutes = require('./routes/execution');
const gitRoutes = require('./routes/git');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/execution', executionRoutes);
app.use('/api/git', gitRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`GitPilot Backend running on port ${PORT}`);
  console.log(`Socket.IO server ready for real-time updates`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };