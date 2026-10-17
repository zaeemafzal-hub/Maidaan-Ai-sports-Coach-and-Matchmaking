import assert from 'node:assert/strict';
import { test } from 'node:test';

// All database requests below are intercepted; this suite needs no live credentials.
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.APP_DATA_MODE = 'production';
const { supabaseAdmin } = require('../src/lib/supabase.js');
const { SupabaseRepo } = require('../src/models/supabaseRepo.js');
const { actionStore } = require('../src/agents/actions/actionStore.js');
const { executeCaptainAction, prepareCreateMatchAction } = require('../src/agents/actions/captainActionTools.js');
const { isUpcomingMatch } = require('../src/utils/matchTime.js');
const userId = '11111111-2222-4333-8444-555555555555';

function fakeQuery(result: unknown, capture?: (payload: any) => void): any {
  const query: any = { then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) };
  for (const method of ['select', 'eq', 'insert', 'upsert', 'update', 'single', 'maybeSingle']) {
    query[method] = (...args: any[]) => {
      if (['upsert', 'insert', 'update'].includes(method)) capture?.(args[0]);
      return query;
    };
  }
  return query;
}

test('revoked roles never fall back to the legacy profile role', async (t) => {
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: [], error: null }));
  const legacy = t.mock.method(SupabaseRepo, 'getProfile', async () => ({ role: 'ADMIN' } as any));
  assert.deepEqual(await SupabaseRepo.getUserRoles(userId), []);
  assert.equal(legacy.mock.callCount(), 0);
});

test('role lookup and grant failures propagate instead of granting memory permissions', async (t) => {
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: null, error: { message: 'database unavailable' } }));
  await assert.rejects(SupabaseRepo.getUserRoles(userId), /database unavailable/);
  await assert.rejects(SupabaseRepo.addRole(userId, 'TEAM_CAPTAIN'), /database unavailable/);
});

test('profile and join request writes report database failures', async (t) => {
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: null, error: { message: 'write rejected' } }));
  await assert.rejects(SupabaseRepo.upsertPlayerProfile({ userId, preferredSports: ['cricket'], skillLevel: 'beginner', primaryLocation: 'Lahore' }), /write rejected/);
  await assert.rejects(SupabaseRepo.upsertCaptainProfile({ userId, teamName: 'Test team', sports: ['cricket'], skillLevel: 'beginner', primaryLocation: 'Lahore' }), /write rejected/);
  await assert.rejects(SupabaseRepo.upsertHubOwnerProfile({ userId, hubName: 'Test hub', location: 'Lahore', courtCount: 2 }), /write rejected/);
  await assert.rejects(SupabaseRepo.createJoinRequest({ matchId: userId, playerId: userId }), /write rejected/);
});

test('player edits omit existing statistics and creation timestamps from the write', async (t) => {
  let payload: any;
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: { user_id: userId, matches_played: 12 }, error: null }, (value) => { payload = value; }));
  const saved = await SupabaseRepo.upsertPlayerProfile({ userId, preferredSports: ['padel'], skillLevel: 'advanced', primaryLocation: 'Lahore' });
  assert.equal(saved.matches_played, 12);
  assert.equal('matches_played' in payload, false);
  assert.equal('created_at' in payload, false);
});

test('live startup never seeds a shared-password administrator', async (t) => {
  const query = t.mock.method(supabaseAdmin, 'from', () => { throw new Error('unexpected database access'); });
  const create = t.mock.method(supabaseAdmin.auth.admin, 'createUser', async () => { throw new Error('unexpected account creation'); });
  await SupabaseRepo.seedAdminIfMissing();
  assert.equal(query.mock.callCount(), 0);
  assert.equal(create.mock.callCount(), 0);
});

test('team query failures propagate instead of hiding missing schema', async (t) => {
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: null, error: { message: 'teams missing' } }));
  await assert.rejects(SupabaseRepo.getCaptainTeam(userId), /teams missing/);
  await assert.rejects(SupabaseRepo.getTeamById(userId), /teams missing/);
});

test('hub onboarding never overwrites administrator verification', async (t) => {
  let payload: any;
  t.mock.method(supabaseAdmin, 'from', () => fakeQuery({ data: { user_id: userId, is_verified: true }, error: null }, (value) => { payload = value; }));
  t.mock.method(SupabaseRepo, 'addRole', async () => {});
  const saved = await SupabaseRepo.upsertHubOwnerProfile({ userId, hubName: 'Test hub', location: 'Lahore', courtCount: 2 });
  assert.equal(saved.is_verified, true);
  assert.equal('is_verified' in payload, false);
  assert.equal('created_at' in payload, false);
});

test('simultaneous confirmations and later retries create exactly one match', async (t) => {
  actionStore.clearStore();
  t.mock.method(SupabaseRepo, 'hasRole', async () => true);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const create = t.mock.method(SupabaseRepo, 'createMatch', async () => {
    await gate;
    return { id: 'one-match', title: 'Test game', date: '2099-10-17', startTime: '18:00' } as any;
  });
  const draft = prepareCreateMatchAction(userId, {
    sport: 'cricket', title: 'Test game', date: '2099-10-17', startTime: '18:00',
    venueName: 'Test venue', area: 'Lahore', skillLevel: 'beginner', totalCapacity: 10,
  });
  assert.ok(draft.success);
  const first = executeCaptainAction(draft.action.actionId, userId);
  const second = executeCaptainAction(draft.action.actionId, userId);
  assert.equal(actionStore.cancelAction(draft.action.actionId, userId), false);
  const outsider = await executeCaptainAction(draft.action.actionId, 'another-captain');
  assert.equal(outsider.success, false);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.success, true);
  assert.deepEqual(a.result, b.result);
  const retry = await executeCaptainAction(draft.action.actionId, userId);
  assert.deepEqual(retry.result, a.result);
  assert.equal(create.mock.callCount(), 1);
  actionStore.clearStore();
});

test('fixture start times use Pakistan time and exclude started or invalid fixtures', () => {
  const now = Date.parse('2026-10-17T13:00:00Z'); // 18:00 in Pakistan
  assert.equal(isUpcomingMatch('2026-10-17', '18:01:00', now), true);
  assert.equal(isUpcomingMatch('2026-10-17', '18:00:00', now), false);
  assert.equal(isUpcomingMatch('2026-10-16', '23:59:00', now), false);
  assert.equal(isUpcomingMatch('invalid', '18:00', now), false);
});
