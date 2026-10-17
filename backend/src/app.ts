import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import captainRoutes from './routes/captainRoutes.js';
import joinRequestRoutes from './routes/joinRequestRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import hubRoutes from './routes/hubRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: '*', // Development CORS policy allowing Expo and preview iframes
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Maidaan Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/captain', captainRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hub', hubRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/agent', agentRoutes);

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: 'API endpoint not found.',
  });
});

export default app;
