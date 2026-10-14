import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('[DevRunner] Starting Maidaan independent dev services...');

const rootDir = process.cwd();
const backendDistServer = path.join(rootDir, 'backend/dist/server.js');

// 1. Start Express backend independently on port 5000
const backendCmd = fs.existsSync(backendDistServer)
  ? { command: 'node', args: ['backend/dist/server.js'] }
  : { command: 'npx', args: ['--prefix', 'backend', 'tsx', 'backend/src/server.ts'] };

const backend = spawn(backendCmd.command, backendCmd.args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '5000',
    BACKEND_PORT: '5000',
  },
});

backend.on('error', (err) => {
  console.error('[DevRunner] Express backend spawn error:', err);
});

// 2. Start Expo Metro independently on port 3000
const mobile = spawn('npm', ['start', '--', '--web', '--port', '3000'], {
  cwd: path.join(rootDir, 'mobile'),
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  },
});

mobile.on('error', (err) => {
  console.error('[DevRunner] Expo Metro spawn error:', err);
});

const cleanup = (code) => {
  try {
    backend.kill();
  } catch {}
  try {
    mobile.kill();
  } catch {}
  process.exit(code || 0);
};

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.warn(`[DevRunner] Backend exited with code ${code}`);
  }
});

mobile.on('exit', (code) => {
  cleanup(code);
});
