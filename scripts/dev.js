import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('[DevRunner] Starting Maidaan independent dev services...');

const rootDir = process.cwd();
const backendDistServer = path.join(rootDir, 'backend/dist/server.js');

// Load backend/.env into the process env so spawned children inherit it
const backendEnvPath = path.join(rootDir, 'backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const envLines = fs.readFileSync(backendEnvPath, 'utf8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
  console.log('[DevRunner] Loaded backend/.env');
}

const isWin = process.platform === 'win32';
const npmBin = isWin ? 'npm.cmd' : 'npm';
const npxBin = isWin ? 'npx.cmd' : 'npx';

// 1. Start Express backend independently on port 5000
const backendCmd = fs.existsSync(backendDistServer)
  ? { command: 'node', args: ['backend/dist/server.js'] }
  : { command: npxBin, args: ['--prefix', 'backend', 'tsx', 'backend/src/server.ts'] };

const backend = spawn(backendCmd.command, backendCmd.args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWin,
  env: {
    ...process.env,
    PORT: '5000',
    BACKEND_PORT: '5000',
  },
});

backend.on('error', (err) => {
  console.error('[DevRunner] Express backend spawn error:', err);
});

// 2. Start Expo Metro on port 8081 (CI=1 suppresses interactive prompts)
const mobile = spawn(npmBin, ['start', '--', '--web', '--port', '8081'], {
  cwd: path.join(rootDir, 'mobile'),
  stdio: 'inherit',
  shell: isWin,
  env: {
    ...process.env,
    CI: '1',
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  },
});

mobile.on('error', (err) => {
  console.error('[DevRunner] Expo Metro spawn error:', err);
});

const cleanup = (code) => {
  try {
    if (isWin) {
      if (backend?.pid) spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
      if (mobile?.pid) spawn('taskkill', ['/pid', mobile.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
    } else {
      backend?.kill();
      mobile?.kill();
    }
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
