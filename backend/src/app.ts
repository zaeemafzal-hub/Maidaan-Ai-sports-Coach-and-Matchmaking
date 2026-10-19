import { corsOrigin } from './config/cors.js';
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
import { VenueController } from './controllers/venueController.js';
import { authenticateSupabaseUser, authorizeRoles } from './middleware/auth.js';
import {BookingController,bookingRoutes} from './controllers/bookingController.js';
import { serviceCities } from './config/locations.js';
import {openMapPage} from './maps/openMapPage.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: corsOrigin, // Development CORS policy allowing Expo and preview iframes
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use('/api/hub/photos', express.json({ limit: '7mb' }));
app.use('/api/profile/player/photo', express.json({ limit: '7mb' }));
app.post('/api/payments/safepay/webhook',express.raw({type:'application/json',limit:'128kb'}),BookingController.safepayWebhook);
app.post('/api/payments/jazzcash/return',express.urlencoded({extended:false,limit:'32kb'}),express.json({limit:'32kb'}),BookingController.jazzcashReturn);
app.get('/api/payments/return',BookingController.returnPage);
app.use(express.json());
app.get('/maps/view',(_req,res)=>{try{res.type('html').send(openMapPage());}catch{res.status(503).send('Map configuration unavailable.');}});

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
app.get('/api/locations', (_req,res)=>res.json({cities:serviceCities.filter(city=>city.enabled)}));
app.use('/api/matches', matchRoutes);
app.use('/api/captain', captainRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hub', hubRoutes);
app.use('/api/bookings',bookingRoutes);
app.get('/api/hubs', authenticateSupabaseUser, authorizeRoles('PLAYER','TEAM_CAPTAIN','HUB_OWNER','ADMIN'), VenueController.browse);
app.get('/api/hubs/:id', authenticateSupabaseUser, authorizeRoles('PLAYER','TEAM_CAPTAIN','HUB_OWNER','ADMIN'), VenueController.details);
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
