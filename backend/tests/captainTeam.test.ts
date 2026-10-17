import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { SupabaseRepo, Sport, SkillLevel } from '../src/models/supabaseRepo.js';

process.env.NODE_ENV = 'test';

async function makeRequest(
  server: http.Server,
  options: {
    path: string;
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (options.token) {
      reqHeaders['Authorization'] = `Bearer ${options.token}`;
    }

    const payload = options.body ? JSON.stringify(options.body) : undefined;
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: options.path,
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 0, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 0, body: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runCaptainTeamTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN CAPTAIN & TEAM MANAGEMENT TEST SUITE');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err.stack || err.message);
      failed++;
    }
  }

  try {
    // Test users
    const captainAId = '00000000-0000-0000-0000-000000000201';
    const captainAToken = `test_token:${captainAId}:captain.a@maidaan.pk`;

    const captainBId = '00000000-0000-0000-0000-000000000202';
    const captainBToken = `test_token:${captainBId}:captain.b@maidaan.pk`;

    const playerUserId = '00000000-0000-0000-0000-000000000203';
    const playerToken = `test_token:${playerUserId}:player.one@maidaan.pk`;

    const squadPlayerId = '00000000-0000-0000-0000-000000000204';

    // 0. Bootstrap test profiles
    await SupabaseRepo.createProfile({
      id: captainAId,
      name: 'Babar Azam',
      email: 'captain.a@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.createProfile({
      id: captainBId,
      name: 'Rizwan Ahmed',
      email: 'captain.b@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.createProfile({
      id: playerUserId,
      name: 'Haris Rauf',
      email: 'player.one@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.createProfile({
      id: squadPlayerId,
      name: 'Shadab Khan',
      email: 'shadab@maidaan.pk',
      role: 'PLAYER',
    });

    // 1. Team Synchronization on Captain Setup
    await test('1. Captain Setup: Automatically creates and syncs team and captain membership', async () => {
      await SupabaseRepo.upsertCaptainProfile({
        userId: captainAId,
        teamName: 'Lahore Strikers',
        sports: ['cricket'],
        skillLevel: 'intermediate',
        primaryLocation: 'Gulberg, Lahore',
      });

      const team = await SupabaseRepo.getCaptainTeam(captainAId);
      assert(team, 'Expected team to be automatically created on captain profile setup');
      assert.strictEqual(team.name, 'Lahore Strikers');
      assert.strictEqual(team.captainId, captainAId);
      assert.strictEqual(team.sport, 'cricket');

      const members = await SupabaseRepo.getTeamMembers(team.id);
      assert.strictEqual(members.length, 1);
      assert.strictEqual(members[0].userId, captainAId);
      assert.strictEqual(members[0].memberRole, 'CAPTAIN');
      assert.strictEqual(members[0].status, 'ACTIVE');
    });

    // 2. GET /api/captain/team
    await test('2. GET /api/captain/team: Returns authenticated captain team', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'GET',
        token: captainAToken,
      });

      assert.strictEqual(res.status, 200);
      assert(res.body.team);
      assert.strictEqual(res.body.team.name, 'Lahore Strikers');
    });

    // 3. POST /api/captain/team: Creates team for captain without existing team
    await test('3. POST /api/captain/team: Creates new team if captain has none', async () => {
      await SupabaseRepo.addRole(captainBId, 'TEAM_CAPTAIN');

      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'POST',
        token: captainBToken,
        body: {
          name: 'Rawalpindi Express',
          sport: 'cricket',
          skillLevel: 'advanced',
          area: 'Saddar, Rawalpindi',
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.team.name, 'Rawalpindi Express');
      assert.strictEqual(res.body.team.captainId, captainBId);
    });

    // 4. Duplicate team creation rejection
    await test('4. POST /api/captain/team: Prevents duplicate team creation for same captain', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'POST',
        token: captainBToken,
        body: {
          name: 'Second Team Attempt',
          sport: 'cricket',
          skillLevel: 'intermediate',
          area: 'Saddar, Rawalpindi',
        },
      });

      assert.strictEqual(res.status, 400);
      assert(res.body.error.includes('already has a registered team'));
    });

    // 5. PATCH /api/captain/team
    await test('5. PATCH /api/captain/team: Updates captain team details', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'PATCH',
        token: captainAToken,
        body: {
          name: 'Lahore Strikers CC',
          area: 'Model Town, Lahore',
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.team.name, 'Lahore Strikers CC');
      assert.strictEqual(res.body.team.area, 'Model Town, Lahore');
    });

    // 6. Role Authorization: Pure PLAYER denied
    await test('6. Security: Pure PLAYER denied from captain team endpoints with 403', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'GET',
        token: playerToken,
      });

      assert.strictEqual(res.status, 403);
    });

    // 7. Cross-captain isolation on team updates
    await test('7. Security: Captain B cannot modify Captain A team directly', async () => {
      const teamA = await SupabaseRepo.getCaptainTeam(captainAId);
      assert(teamA);

      await assert.rejects(
        async () => {
          await SupabaseRepo.updateTeam(teamA.id, captainBId, { name: 'Hijacked Team' });
        },
        /Only the team captain can update team details/
      );
    });

    // 8. Add member to team roster
    await test('8. POST /api/captain/team/members: Adds member to team roster', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team/members',
        method: 'POST',
        token: captainAToken,
        body: {
          userId: squadPlayerId,
          memberRole: 'VICE_CAPTAIN',
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.member.userId, squadPlayerId);
      assert.strictEqual(res.body.member.memberRole, 'VICE_CAPTAIN');
      assert.strictEqual(res.body.member.userName, 'Shadab Khan');
    });

    // 9. Duplicate roster member prevention
    await test('9. POST /api/captain/team/members: Prevents adding duplicate member to roster', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team/members',
        method: 'POST',
        token: captainAToken,
        body: {
          userId: squadPlayerId,
        },
      });

      assert.strictEqual(res.status, 400);
      assert(res.body.error.includes('already an active member'));
    });

    // 10. GET /api/captain/team/members: Returns sorted roster
    await test('10. GET /api/captain/team/members: Returns team roster with captain first', async () => {
      const res = await makeRequest(server, {
        path: '/api/captain/team/members',
        method: 'GET',
        token: captainAToken,
      });

      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.members));
      assert.strictEqual(res.body.members.length, 2);
      assert.strictEqual(res.body.members[0].memberRole, 'CAPTAIN');
      assert.strictEqual(res.body.members[1].memberRole, 'VICE_CAPTAIN');
    });

    // 11. Captain cannot remove themselves
    await test('11. Security: Captain cannot remove themselves from their own team roster', async () => {
      const res = await makeRequest(server, {
        path: `/api/captain/team/members/${captainAId}`,
        method: 'DELETE',
        token: captainAToken,
      });

      assert.strictEqual(res.status, 400);
      assert(res.body.error.includes('Captain cannot remove themselves'));
    });

    // 12. Remove member from roster
    await test('12. DELETE /api/captain/team/members/:userId: Removes member from roster', async () => {
      const res = await makeRequest(server, {
        path: `/api/captain/team/members/${squadPlayerId}`,
        method: 'DELETE',
        token: captainAToken,
      });

      assert.strictEqual(res.status, 200);
      const teamA = await SupabaseRepo.getCaptainTeam(captainAId);
      const members = await SupabaseRepo.getTeamMembers(teamA!.id);
      assert.strictEqual(members.length, 1);
    });

    // 13. Create Match with Team Link & Safe Recruitment
    let testMatchId = '';
    await test('13. Match Creation: Links captain team and sets initial open slots', async () => {
      const teamA = await SupabaseRepo.getCaptainTeam(captainAId);
      assert(teamA);

      const res = await makeRequest(server, {
        path: '/api/matches',
        method: 'POST',
        token: captainAToken,
        body: {
          sport: 'cricket',
          title: 'Sunday Tape Ball Clash',
          date: new Date().toISOString().split('T')[0],
          startTime: '19:00',
          venueName: 'Gulberg Nets',
          area: 'Gulberg, Lahore',
          skillLevel: 'intermediate',
          totalCapacity: 10,
          openSlots: 4,
          teamId: teamA.id,
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.teamId, teamA.id);
      assert.strictEqual(res.body.teamName, 'Lahore Strikers CC');
      assert.strictEqual(res.body.openSlots, 4);
      assert.strictEqual(res.body.status, 'OPEN');
      testMatchId = res.body.id;
    });

    // 13b. Pre-Phase B Regression: Captain cannot create match pointing to another captain's team
    await test('13b. Security: Reject match creation when specified teamId belongs to another captain', async () => {
      const teamB = await SupabaseRepo.getCaptainTeam(captainBId);
      assert(teamB);

      const res = await makeRequest(server, {
        path: '/api/matches',
        method: 'POST',
        token: captainAToken, // Captain A trying to attach Captain B's team
        body: {
          sport: 'cricket',
          title: 'Unauthorized Team Spoof',
          date: new Date().toISOString().split('T')[0],
          startTime: '20:00',
          venueName: 'Gulberg Nets',
          area: 'Gulberg, Lahore',
          skillLevel: 'intermediate',
          totalCapacity: 10,
          openSlots: 2,
          teamId: teamB.id,
        },
      });

      assert.strictEqual(res.status, 403);
      assert(res.body.error.includes('does not belong to the authenticated captain'));
    });

    // 13c. Pre-Phase B Regression: VICE_CAPTAIN roster designation does NOT grant captain platform access
    await test('13c. Security: VICE_CAPTAIN roster designation does not grant captain platform access', async () => {
      // squadPlayerId is a VICE_CAPTAIN on Captain A's team, but only has PLAYER platform role
      const res = await makeRequest(server, {
        path: '/api/captain/team',
        method: 'GET',
        token: `test_token:${squadPlayerId}:shadab@maidaan.pk`,
      });

      assert.strictEqual(res.status, 403);
    });

    // 13d. Pre-Phase B Regression: Member addition validations
    await test('13d. Validation: Reject captain self-duplicate or primary CAPTAIN designation', async () => {
      // Captain adding themselves
      const selfRes = await makeRequest(server, {
        path: '/api/captain/team/members',
        method: 'POST',
        token: captainAToken,
        body: {
          userId: captainAId,
          memberRole: 'PLAYER',
        },
      });
      assert.strictEqual(selfRes.status, 400);
      assert(selfRes.body.error.includes('primary owner'));

      // Designating role as CAPTAIN
      const roleRes = await makeRequest(server, {
        path: '/api/captain/team/members',
        method: 'POST',
        token: captainAToken,
        body: {
          userId: squadPlayerId,
          memberRole: 'CAPTAIN',
        },
      });
      assert.strictEqual(roleRes.status, 400);
      assert(roleRes.body.error.includes('multiple primary captains'));
    });

    // 14. Update match recruitment: Increase open slots within capacity
    await test('14. PATCH /api/captain/matches/:id/recruitment: Updates open slots safely', async () => {
      const res = await makeRequest(server, {
        path: `/api/captain/matches/${testMatchId}/recruitment`,
        method: 'PATCH',
        token: captainAToken,
        body: {
          openSlots: 6,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.match.openSlots, 6);
      assert.strictEqual(res.body.match.status, 'OPEN');
    });

    // 15. Update match recruitment: Setting openSlots to 0 marks match FULL
    await test('15. PATCH /api/captain/matches/:id/recruitment: Setting 0 slots transitions status to FULL', async () => {
      const res = await makeRequest(server, {
        path: `/api/captain/matches/${testMatchId}/recruitment`,
        method: 'PATCH',
        token: captainAToken,
        body: {
          openSlots: 0,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.match.openSlots, 0);
      assert.strictEqual(res.body.match.status, 'FULL');
    });

    // 16. Recruitment validation: Rejects out of bounds slots & cross-captain isolation
    await test('16. Security & Bounds: Rejects invalid slot counts and cross-captain recruitment modification', async () => {
      // Negative slots
      const negRes = await makeRequest(server, {
        path: `/api/captain/matches/${testMatchId}/recruitment`,
        method: 'PATCH',
        token: captainAToken,
        body: {
          openSlots: -2,
        },
      });
      assert.strictEqual(negRes.status, 400);

      // Exceeds total capacity (capacity is 10)
      const overRes = await makeRequest(server, {
        path: `/api/captain/matches/${testMatchId}/recruitment`,
        method: 'PATCH',
        token: captainAToken,
        body: {
          openSlots: 15,
        },
      });
      assert.strictEqual(overRes.status, 400);

      // Cross-captain recruitment attempt (Captain B trying to modify Captain A's match)
      const crossRes = await makeRequest(server, {
        path: `/api/captain/matches/${testMatchId}/recruitment`,
        method: 'PATCH',
        token: captainBToken,
        body: {
          openSlots: 2,
        },
      });
      assert.strictEqual(crossRes.status, 403);
    });

    // 17. Match join acceptance updates match participants without polluting team roster
    await test('17. Architecture Separation: Match join acceptance leaves team roster unmutated', async () => {
      // Re-open match with 2 slots
      await SupabaseRepo.updateMatchRecruitment(testMatchId, captainAId, 2);

      // Player requests to join
      const joinReq = await SupabaseRepo.createJoinRequest({
        matchId: testMatchId,
        playerId: playerUserId,
        message: 'Looking forward to playing!',
      });

      // Captain accepts
      const acceptResult = await SupabaseRepo.acceptJoinRequest(joinReq.id, captainAId);
      assert.strictEqual(acceptResult.success, true);
      assert.strictEqual(acceptResult.openSlots, 1);

      // Verify participant is confirmed in match
      const isParticipant = await SupabaseRepo.isMatchParticipant(testMatchId, playerUserId);
      assert.strictEqual(isParticipant, true);

      // Verify team roster was NOT mutated (still only 1 captain member)
      const teamA = await SupabaseRepo.getCaptainTeam(captainAId);
      const members = await SupabaseRepo.getTeamMembers(teamA!.id);
      assert.strictEqual(members.length, 1);
      assert(!members.some((m) => m.userId === playerUserId), 'Match participant must NOT be automatically added to team roster');
    });

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCaptainTeamTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
