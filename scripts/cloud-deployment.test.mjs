import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateCloudEnvironment } from './check-cloud-env.mjs';

const valid = {
  EXPO_PUBLIC_API_URL: 'https://maidaan-test.onrender.com',
  EXPO_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-value',
  EXPO_PUBLIC_APP_DATA_MODE: 'production',
};

test('web and standalone builds require public HTTPS configuration', () => {
  assert.doesNotThrow(() => validateCloudEnvironment(valid));
  for (const url of ['', 'http://192.168.18.11:5000', 'https://localhost', 'https://192.168.18.11', 'https://api.example.com/api', 'https://name:secret@api.example.com']) {
    assert.throws(() => validateCloudEnvironment({ ...valid, EXPO_PUBLIC_API_URL: url }));
  }
  assert.throws(() => validateCloudEnvironment({ ...valid, EXPO_PUBLIC_SOCKET_URL: 'http://localhost:5000' }));
  assert.throws(() => validateCloudEnvironment({ ...valid, EXPO_PUBLIC_APP_DATA_MODE: 'demo' }));
  assert.doesNotThrow(() => validateCloudEnvironment({ ...valid, EXPO_PUBLIC_API_TIMEOUT_MS: '120000' }));
  assert.throws(() => validateCloudEnvironment({ ...valid, EXPO_PUBLIC_API_TIMEOUT_MS: 'invalid' }));
});

test('cloud build validation runs as a CLI and development EAS remains local', () => {
  const run = (args, env) => spawnSync(process.execPath, ['scripts/check-cloud-env.mjs', ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(run([], valid).status, 0);
  const missing = { ...valid, EXPO_PUBLIC_API_URL: '' };
  assert.notEqual(run([], missing).status, 0);
  assert.notEqual(run(['--eas'], { ...missing, EAS_BUILD_PROFILE: 'preview' }).status, 0);
  assert.equal(run(['--eas'], { ...missing, EAS_BUILD_PROFILE: 'development' }).status, 0);
});

test('locked native build dependencies include Linux and macOS binaries', () => {
  const { packages } = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const parent of ['node_modules/lightningcss', 'node_modules/react-native-css-interop/node_modules/lightningcss', 'node_modules/esbuild']) {
    const root = parent.slice(0, parent.lastIndexOf('node_modules/')) + 'node_modules/';
    for (const [name, version] of Object.entries(packages[parent].optionalDependencies)) {
      const binding = packages[root + name];
      assert.ok(binding, `${parent}: missing ${name}`);
      assert.equal(binding.version, version, `${name} must match its native loader`);
      assert.ok(binding.integrity, `${name} needs a locked integrity hash`);
    }
  }
});
