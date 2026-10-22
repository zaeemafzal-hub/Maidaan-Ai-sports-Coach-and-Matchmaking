import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../mobile/services/authService.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText;
const user = { id: 'test-user', email: 'athlete@example.com', email_confirmed_at: '2026-10-17', created_at: '2026-10-17', user_metadata: { full_name: 'Test Athlete', role: 'ADMIN' } };
const session = { access_token: 'test-access', refresh_token: 'test-refresh' };
const me = { user: { id: user.id, name: 'Test Athlete', roles: ['PLAYER'] }, roles: ['PLAYER'], onboarding: { player: false, captain: false, hubOwner: false } };
const policy = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../mobile/utils/passwordPolicy.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:policy});

function runtime({ platform = 'web', expoGo = false, configured = true, auth = {}, get, post, browserResult } = {}) {
  const calls = { tokens: [], redirects: [], browser: [], init: [], signup: [], oauth: [], exchanges: [] };
  const authMock = {
    signUp: async (input) => { calls.signup.push(input); return { data: { user, session: null }, error: null }; },
    signInWithPassword: async () => ({ data: { user, session }, error: null }),
    signInWithOAuth: async (input) => { calls.oauth.push(input); return { data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' }, error: null }; },
    exchangeCodeForSession: async (value) => { calls.exchanges.push(value); return { data: { session }, error: null }; },
    setSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    signOut: async () => ({ error: null }),
    ...auth,
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, URLSearchParams,
    window: { location: { origin: 'http://localhost:8081', assign: (url) => calls.redirects.push(url) } },
    require(name) {
      if (name === 'expo-linking') return { createURL: (path) => 'maidaan://' + path };
      if (name === 'expo-web-browser') return { openAuthSessionAsync: async (...args) => { calls.browser.push(args); return browserResult || { type: 'success', url: 'maidaan://auth/callback?code=valid' }; } };
      if (name === 'expo-constants') return { __esModule: true, default: { executionEnvironment: expoGo ? 'go' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'go' } };
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === './api') return { api: {
        get: get || (async () => ({ status: 200, data: me })),
        post: post || (async (path, input) => { calls.init.push({ path, input }); return { status: 200, data: { user: me.user } }; }),
      } };
      if (name === './storage') return { AuthStorage: { setToken: async (token) => calls.tokens.push(token), removeToken: async () => calls.tokens.push(null) } };
      if (name === '../lib/supabase') return { supabase: { auth: authMock }, isSupabaseConfigured: configured };
      if (name === '../utils/passwordPolicy') return policy;
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { service: exports.authService, calls };
}

test('signup normalizes email, honors confirmation and never creates a fake session', async () => {
  const { service, calls } = runtime();
  const result = await service.register({ name: ' Test Athlete ', email: ' ATHLETE@example.com ', password: 'LongPassword123!' });
  assert.equal(result.needsEmailConfirmation, true);
  assert.equal(result.token, undefined);
  assert.equal(calls.tokens.length, 0);
  assert.equal(calls.init.length, 0);
  assert.equal(calls.signup[0].email, 'athlete@example.com');
  assert.equal(calls.signup[0].options.emailRedirectTo, 'http://localhost:8081/auth/callback');
  assert.equal(calls.signup[0].options.data.role, undefined);
});

test('missing configuration rejects login, signup and Google instead of synthetic authentication', async () => {
  const { service } = runtime({ configured: false });
  await assert.rejects(service.login({ email: user.email, password: 'anything' }), /not configured/);
  await assert.rejects(service.register({ name: 'Athlete', email: user.email, password: 'password123' }), /not configured/);
  await assert.rejects(service.signInWithGoogle(), /not configured/);
});

test('client rejects weak signup and reset passwords before contacting authentication', async () => {
  const {service,calls}=runtime();
  for (const password of ['password123','PASSWORD1!','Password12','Aa1!aaa']) {
    await assert.rejects(service.register({name:'Athlete',email:user.email,password}), /special character/);
    await assert.rejects(service.updatePassword(password), /special character/);
  }
  assert.equal(calls.signup.length,0);
});

test('a session for an unverified email cannot load a profile or retain a token', async () => {
  const {service,calls}=runtime({auth:{signInWithPassword:async()=>({data:{user:{...user,email_confirmed_at:null},session},error:null})}});
  await assert.rejects(service.login({email:user.email,password:'Password123!'}),/verify your email/);
  assert.equal(calls.init.length,0);
  assert.deepEqual(calls.tokens,[null]);
});

test('signup rejects provider auto-confirmation instead of granting unverified access', async () => {
  const { service, calls } = runtime({ auth: { signUp: async () => ({ data: { user, session }, error: null }) } });
  await assert.rejects(service.register({ name: 'Athlete', email: user.email, password: 'Password123!' }), /verification must be enabled/);
  assert.equal(calls.init.length, 0);
  assert.equal(calls.tokens.at(-1), null);
});

test('signup and password errors propagate without a second registration attempt', async () => {
  const { service } = runtime({ auth: {
    signUp: async () => ({ data: {}, error: { message: 'Email rate limit exceeded' } }),
    signInWithPassword: async () => ({ data: {}, error: { message: 'Invalid login credentials' } }),
  } });
  await assert.rejects(service.register({ name: 'Athlete', email: user.email, password: 'Password123!' }), /rate limit/);
  await assert.rejects(service.login({ email: user.email, password: 'wrong' }), /Invalid login/);
});

test('a valid password cannot hide an unavailable backend behind a metadata user', async () => {
  const { service } = runtime({ get: async () => ({ status: 503, error: 'Backend unavailable' }) });
  await assert.rejects(service.login({ email: user.email, password: 'password123' }), /Backend unavailable/);
});

test('first OAuth login initializes a missing profile as PLAYER, regardless of metadata role', async () => {
  let reads = 0;
  const { service, calls } = runtime({ get: async () => ++reads === 1 ? { status: 404 } : { status: 200, data: me } });
  const result = await service.me();
  assert.equal(result.user.id, user.id);
  assert.equal(calls.init.length, 1);
  assert.equal(calls.init[0].input.role, 'PLAYER');
  assert.equal(calls.init[0].input.name, 'Test Athlete');
});

test('web Google flow redirects to Supabase with the actual web callback origin', async () => {
  const { service, calls } = runtime();
  await service.signInWithGoogle();
  assert.equal(calls.oauth[0].options.redirectTo, 'http://localhost:8081/auth/callback');
  assert.equal(calls.redirects.length, 1);
  assert.equal(calls.browser.length, 0);
});

test('Expo Go explains its OAuth limitation without opening a broken redirect', async () => {
  const { service, calls } = runtime({ platform: 'android', expoGo: true });
  await assert.rejects(service.signInWithGoogle(), /development app/);
  assert.equal(calls.oauth.length, 0);
});

test('native browser cancellation does not create a session', async () => {
  const { service, calls } = runtime({ platform: 'android', browserResult: { type: 'cancel' } });
  assert.equal((await service.signInWithGoogle()).success, false);
  assert.equal(calls.tokens.length, 0);
});

test('native success exchanges the code once even when the route also receives it', async () => {
  const { service, calls } = runtime({ platform: 'android' });
  assert.equal((await service.signInWithGoogle()).success, true);
  await service.handleAuthCallbackUrl('maidaan://auth/callback?code=valid');
  assert.equal(calls.exchanges.length, 1);
  assert.equal(calls.browser[0][1], 'maidaan://auth/callback');
});

test('callbacks reject provider errors and foreign origins without exchanging tokens', async () => {
  const { service, calls } = runtime();
  assert.equal(await service.handleAuthCallbackUrl('https://other.example/auth/callback?code=stolen'), null);
  await assert.rejects(service.handleAuthCallbackUrl('http://localhost:8081/auth/callback?error=access_denied&error_description=User+cancelled'), /User cancelled/);
  assert.equal(calls.exchanges.length, 0);
});

test('legacy recovery tokens establish a session and retain the recovery intent', async () => {
  const { service, calls } = runtime();
  const result = await service.handleAuthCallbackUrl('http://localhost:8081/reset-password#access_token=test-access&refresh_token=test-refresh&type=recovery');
  assert.equal(result.type, 'recovery');
  assert.equal(calls.tokens[0], 'test-access');
});

test('logout clears cached local tokens even if Supabase reports an error', async () => {
  const { service, calls } = runtime({ auth: { signOut: async () => ({ error: new Error('Offline') }) } });
  await assert.rejects(service.logout(), /Offline/);
  assert.equal(calls.tokens.at(-1), null);
});

const finishCode = ts.transpileModule(fs.readFileSync(new URL('../mobile/services/completeSignIn.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function finishRuntime(state, loaded = true) {
  const exports = {};
  vm.runInNewContext(finishCode, { exports, require: () => ({ useAuthStore: {
    getState: () => ({ ...state, loadProfile: async () => loaded }),
  } }) });
  return exports.completeSignIn;
}
test('routing uses loaded onboarding and the current account mode', async () => {
  assert.equal(await finishRuntime({ currentUser: me.user, activeMode: 'PLAYER', authStatus: 'ONBOARDING_REQUIRED' })(), '/onboarding/player-setup');
  assert.equal(await finishRuntime({ currentUser: me.user, activeMode: 'TEAM_CAPTAIN', authStatus: 'ONBOARDING_REQUIRED' })(), '/onboarding/captain-setup');
  assert.equal(await finishRuntime({ currentUser: me.user, activeMode: 'ADMIN', authStatus: 'READY' })(), '/admin/dashboard');
  assert.equal(await finishRuntime({ currentUser: me.user, activeMode: 'PLAYER', authStatus: 'READY' })(), '/(tabs)/discover');
});
test('failed profile loading never routes into onboarding or the signed-in app', async () => {
  await assert.rejects(finishRuntime({ currentUser: null, authStatus: 'ERROR', errorMessage: 'Backend unavailable' }, false), /Backend unavailable/);
});
