import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../src/lib/supabase.js';
import { SupabaseRepo } from '../src/models/supabaseRepo.js';
import { isUpcomingMatch } from '../src/utils/matchTime.js';

// Uses one disposable account; never edits existing users or fixtures.
async function main() {
  process.env.APP_DATA_MODE = 'production';
  let userId: string | undefined;
  try {
    for (const table of ['user_roles', 'teams', 'team_members']) {
      const { error } = await supabaseAdmin.from(table).select('*').limit(0);
      if (error) throw new Error(`Database repair required (${table}): ${error.message}`);
    }
    const password = crypto.randomBytes(32).toString('base64url');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `reliability-${crypto.randomUUID()}@example.com`,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message || 'Could not create verification account.');
    userId = data.user.id;
    await SupabaseRepo.createProfile({ id: userId, name: 'Temporary Verification', email: data.user.email!, role: 'PLAYER' });
    assert.deepEqual(await SupabaseRepo.getUserRoles(userId), ['PLAYER']);
    const baseUrl = process.env.VERIFY_API_URL;
    let headers: Record<string, string> = {};
    if (baseUrl) {
      // Separate client keeps the service-role client's authorization unchanged.
      const auth = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const login = await auth.auth.signInWithPassword({ email: data.user.email!, password });
      if (login.error || !login.data.session) throw new Error(login.error?.message || 'Verification login failed.');
      headers = { Authorization: `Bearer ${login.data.session.access_token}` };
      const health = await fetch(`${baseUrl}/api/health`);
      assert.equal(health.status, 200);
      const profile = await fetch(`${baseUrl}/api/profile/me`, { headers });
      assert.equal(profile.status, 200);
      const discover = await fetch(`${baseUrl}/api/matches`, { headers });
      assert.equal(discover.status, 200);
      console.log('PASS: running API health, authenticated profile and discovery');
    }
    const player = { userId, preferredSports: ['cricket' as const], skillLevel: 'beginner' as const, primaryLocation: 'Lahore' };
    await SupabaseRepo.upsertPlayerProfile({ ...player, matchesPlayed: 12 });
    const edited = await SupabaseRepo.upsertPlayerProfile({ ...player, primaryLocation: 'Karachi' });
    assert.equal(edited.matches_played, 12);
    console.log('PASS: live player profile edits preserve existing statistics');

    await SupabaseRepo.upsertCaptainProfile({ userId, teamName: 'Temporary Verification Team', sports: ['cricket'], skillLevel: 'beginner', primaryLocation: 'Lahore' });
    const team = await SupabaseRepo.getCaptainTeam(userId);
    assert.ok(team);
    const members = await supabaseAdmin.from('team_members').select('member_role').eq('team_id', team.id).eq('user_id', userId);
    if (members.error) throw new Error(members.error.message);
    assert.equal(members.data?.[0]?.member_role, 'CAPTAIN');
    await SupabaseRepo.upsertCaptainProfile({ userId, teamName: 'Temporary Verification Team', sports: ['padel'], skillLevel: 'advanced', primaryLocation: 'Karachi' });
    const updatedTeam = await SupabaseRepo.getCaptainTeam(userId);
    assert.equal(updatedTeam?.sport, 'padel');
    assert.equal(updatedTeam?.area, 'Karachi');
    console.log('PASS: live captain onboarding creates membership and synchronizes team edits');
    if (baseUrl) {
      const response = await fetch(`${baseUrl}/api/captain/team`, { headers });
      assert.equal(response.status, 200);
      console.log('PASS: running API grants the new captain access to their saved team');
    }

    const revoke = await supabaseAdmin.from('user_roles').update({ status: 'REVOKED' }).eq('user_id', userId).eq('role', 'TEAM_CAPTAIN');
    if (revoke.error) throw new Error(revoke.error.message);
    assert.equal(await SupabaseRepo.hasRole(userId, 'TEAM_CAPTAIN'), false);
    if (baseUrl) {
      const response = await fetch(`${baseUrl}/api/captain/team`, { headers });
      assert.equal(response.status, 403);
      console.log('PASS: running API rejects the same session after captain role revocation');
    }
    console.log('PASS: live role revocation removes captain authorization');

    const matches = await SupabaseRepo.getMatches();
    assert.ok(matches.every((match) => isUpcomingMatch(match.date, match.startTime)));
    console.log(`PASS: live discovery returns only upcoming fixtures (${matches.length})`);
  } finally {
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`Verification account cleanup failed: ${error.message}`);
      const profile = await SupabaseRepo.getProfile(userId);
      assert.equal(profile, null);
      const teams = await supabaseAdmin.from('teams').select('id').eq('captain_id', userId);
      if (teams.error) throw new Error(teams.error.message);
      assert.equal(teams.data?.length, 0);
      console.log('PASS: temporary account, profile, team and membership cleaned up');
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
