import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
process.env.APP_DATA_MODE = 'production';
const { AuthController } = require('../src/controllers/authController.js');

function response() {
  const result = { status: 0, body: null as any };
  const res: any = { status: (value: number) => { result.status = value; return res; }, json: (value: any) => { result.body = value; return res; } };
  return { res, result };
}
test('public signup uses public-key signup and leaves confirmation required', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async (input: any, options: any) => {
    assert.match(String(input), /\/auth\/v1\/signup/);
    assert.equal(new Headers(options.headers).get('apikey'), 'test-public-key');
    const body = JSON.parse(options.body);
    assert.equal(body.email_confirm, undefined);
    assert.equal(body.email, 'athlete@example.com');
    return new Response(JSON.stringify({ id: 'test-user', email: body.email, created_at: '2026-10-17', identities: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const { res, result } = response();
  await AuthController.register({ body: { name: 'Athlete', email: ' ATHLETE@example.com ', password: 'Password123!' } }, res);
  assert.equal(result.status, 201);
  assert.equal(result.body.needsEmailConfirmation, true);
  assert.equal(result.body.user.role, 'PLAYER');
  assert.equal(request.mock.callCount(), 1);
});
test('public signup rejects short passwords and administrator accounts before contacting Supabase', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request'); });
  const short = response();
  await AuthController.register({ body: { name: 'Athlete', email: 'a@example.com', password: '1234567' } }, short.res);
  assert.equal(short.result.status, 400);
  const admin = response();
  await AuthController.register({ body: { name: 'Athlete', email: 'a@example.com', password: 'Password123!', role: 'ADMIN' } }, admin.res);
  assert.equal(admin.result.status, 403);
  assert.equal(request.mock.callCount(), 0);
});
