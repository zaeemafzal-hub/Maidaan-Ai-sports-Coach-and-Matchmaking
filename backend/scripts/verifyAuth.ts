import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../src/lib/supabase.js';

async function main() {
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!publicKey) throw new Error('A Supabase public key is required.');
  const auth = createClient(process.env.SUPABASE_URL!, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const baseUrl = process.env.VERIFY_API_URL || 'http://localhost:5000';
  const email = `auth-verification-${crypto.randomUUID()}@maidaan.pk`;
  const password = crypto.randomBytes(32).toString('base64url');
  let userId: string | undefined;
  try {
    // Generates the normal verification token without sending mail to an inbox.
    const link = await supabaseAdmin.auth.admin.generateLink({ type: 'signup', email, password, options: { data: { name: 'Temporary Auth Verification' } } });
    if (link.error || !link.data.user) throw new Error(link.error?.message || 'Could not generate signup verification.');
    userId = link.data.user.id;
    assert.equal((await auth.auth.signInWithPassword({ email, password })).error?.code, 'email_not_confirmed');
    console.log('PASS: unconfirmed email cannot sign in');
    const verified = await auth.auth.verifyOtp({ type: 'signup', token_hash: link.data.properties.hashed_token });
    if (verified.error || !verified.data.session) throw new Error(verified.error?.message || 'Confirmation failed.');
    console.log('PASS: signup verification token confirms email and creates a real session');
    const wrong = await auth.auth.signInWithPassword({ email, password: 'DeliberatelyWrongPassword123!' });
    assert.ok(wrong.error);
    const login = await auth.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw new Error(login.error?.message || 'Password login failed.');
    let headers = { Authorization: `Bearer ${login.data.session.access_token}`, 'Content-Type': 'application/json' };
    console.log('PASS: wrong password rejected and correct password accepted');
    assert.equal((await fetch(`${baseUrl}/api/profile/me`, { headers })).status, 404);
    const initialized = await fetch(`${baseUrl}/api/profile/init`, { method: 'POST', headers, body: JSON.stringify({ name: 'Temporary Auth Verification', role: 'PLAYER' }) });
    assert.equal(initialized.status, 200);
    const profileResponse = await fetch(`${baseUrl}/api/profile/me`, { headers });
    assert.equal(profileResponse.status, 200);
    const profile = await profileResponse.json();
    assert.deepEqual(profile.roles, ['PLAYER']);
    assert.equal(profile.onboarding.player, false);
    console.log('PASS: first-login profile bootstrap returns PLAYER and requires onboarding');
    const refresh = await auth.auth.refreshSession();
    if (refresh.error || !refresh.data.session) throw new Error(refresh.error?.message || 'Session refresh failed.');
    headers = { ...headers, Authorization: `Bearer ${refresh.data.session.access_token}` };
    assert.equal((await fetch(`${baseUrl}/api/profile/me`, { headers })).status, 200);
    console.log('PASS: refreshed session still accesses the API');
    const logout = await auth.auth.signOut({ scope: 'local' });
    if (logout.error) throw new Error(logout.error.message);
    assert.equal((await auth.auth.getSession()).data.session, null);
    assert.equal((await fetch(`${baseUrl}/api/profile/me`)).status, 401);
    console.log('PASS: logout clears local session and unauthenticated API calls are rejected');
    const settings = await fetch(`${process.env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: publicKey } });
    const config = await settings.json();
    console.log(`Google provider enabled: ${Boolean(config.external?.google)}`);
  } finally {
    if (userId) {
      const cleanup = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanup.error) throw new Error(`Temporary auth account cleanup failed: ${cleanup.error.message}`);
      const remaining = await supabaseAdmin.from('profiles').select('id').eq('id', userId);
      if (remaining.error) throw new Error(remaining.error.message);
      assert.equal(remaining.data?.length, 0);
      console.log('PASS: temporary auth account and profile cleaned up');
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
