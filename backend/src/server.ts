import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { SupabaseRepo } from './models/supabaseRepo.js';
import { isServerSupabaseConfigured } from './lib/supabase.js';
import { initSocketServer } from './socket/socketServer.js';
import {
  isProduction,
  isTest,
  validateProductionInvariants,
  getAppDataMode,
} from './config/runtime.js';

dotenv.config();

// Enforce strict production invariants at startup
validateProductionInvariants(isServerSupabaseConfigured);

const PORT = Number(process.env.BACKEND_PORT) || 5000;

// Initialize Supabase admin and initial matches ONLY in test mode or local sandbox
(async () => {
  if (!isProduction()) {
    await SupabaseRepo.seedAdminIfMissing();
    if (isTest() || !isServerSupabaseConfigured) {
      await SupabaseRepo.seedInitialMatchesIfEmpty();
    }
  }
})();

const httpServer = http.createServer(app);
initSocketServer(httpServer);

const shouldListen = process.env.SKIP_SERVER_LISTEN !== 'true';

if (shouldListen) {
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
