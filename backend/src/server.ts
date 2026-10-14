import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { SupabaseRepo } from './models/supabaseRepo.js';
import { initSocketServer } from './socket/socketServer.js';

dotenv.config();

const PORT = Number(process.env.BACKEND_PORT) || 5000;

// Initialize Supabase admin and initial matches seeds in test mode
(async () => {
  await SupabaseRepo.seedAdminIfMissing();
  if (process.env.NODE_ENV === 'test') {
    await SupabaseRepo.seedInitialMatchesIfEmpty();
  }
})();

const httpServer = http.createServer(app);
initSocketServer(httpServer);

if (process.env.NODE_ENV !== 'unit-test') {
  httpServer.listen(PORT, () => {
    console.log(`[Maidaan] Supabase-backed Express API running on port ${PORT}`);
  });
  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Maidaan] Port ${PORT} already in use by active backend process.`);
    } else {
      console.error('[Maidaan] Server error:', err);
    }
  });
}

export { httpServer };
export default app;
