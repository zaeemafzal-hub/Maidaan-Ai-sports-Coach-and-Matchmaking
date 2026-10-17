import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { SupabaseRepo, Sport, CourtStatus } from '../src/models/supabaseRepo.js';

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

async function runHubOwnerTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN HUB OWNER & COURT MANAGEMENT TEST SUITE');
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
    const playerOnlyId = '00000000-0000-0000-0000-000000000301';
    const playerToken = `test_token:${playerOnlyId}:pureplayer@maidaan.pk`;

    const captainOnlyId = '00000000-0000-0000-0000-000000000302';
    const captainToken = `test_token:${captainOnlyId}:captainonly@maidaan.pk`;

    const hubOwnerAId = '00000000-0000-0000-0000-000000000303';
    const hubOwnerAToken = `test_token:${hubOwnerAId}:owner.a@maidaan.pk`;

    const hubOwnerBId = '00000000-0000-0000-0000-000000000304';
    const hubOwnerBToken = `test_token:${hubOwnerBId}:owner.b@maidaan.pk`;

    const hubOwnerCId = '00000000-0000-0000-0000-000000000305';
    const hubOwnerCToken = `test_token:${hubOwnerCId}:owner.c@maidaan.pk`;

    const hubOwnerDId = '00000000-0000-0000-0000-000000000306';
    const hubOwnerDToken = `test_token:${hubOwnerDId}:owner.d@maidaan.pk`;

    const legacyHubOwnerId = '00000000-0000-0000-0000-000000000307';
    const legacyHubOwnerToken = `test_token:${legacyHubOwnerId}:legacy.owner@maidaan.pk`;

    const hubOwnerEId = '00000000-0000-0000-0000-000000000308';
    const hubOwnerEToken = `test_token:${hubOwnerEId}:owner.e@maidaan.pk`;

    const adminId = '00000000-0000-0000-0000-000000000001';

    // 0. Bootstrap profiles
    await SupabaseRepo.createProfile({
      id: playerOnlyId,
      name: 'Solo Player',
      email: 'pureplayer@maidaan.pk',
      role: 'PLAYER',
    });

    await SupabaseRepo.createProfile({
      id: captainOnlyId,
      name: 'Team Captain',
      email: 'captainonly@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(captainOnlyId, 'TEAM_CAPTAIN');

    await SupabaseRepo.createProfile({
      id: hubOwnerAId,
      name: 'Tariq Hub Owner',
      email: 'owner.a@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerAId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerAId,
      hubName: 'Apex Sports Arena',
      contactNumber: '+92 300 1112233',
      location: 'Gulberg III, Lahore',
      sports: ['cricket', 'padel'] as Sport[],
      courtCount: 0,
    });

    await SupabaseRepo.createProfile({
      id: hubOwnerBId,
      name: 'Bilal Venue Owner',
      email: 'owner.b@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerBId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerBId,
      hubName: 'Smash Padel Complex',
      contactNumber: '+92 321 4445566',
      location: 'DHA Phase 5, Lahore',
      sports: ['padel'] as Sport[],
      courtCount: 0,
    });

    await SupabaseRepo.createProfile({
      id: hubOwnerCId,
      name: 'Court Counter Owner',
      email: 'owner.c@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerCId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerCId,
      hubName: 'Model Town Cricket Arena',
      contactNumber: '+92 333 7778899',
      location: 'Model Town, Lahore',
      sports: ['cricket', 'badminton'] as Sport[],
      courtCount: 0,
    });

    await SupabaseRepo.createProfile({
      id: hubOwnerDId,
      name: 'Integrity Owner',
      email: 'owner.d@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerDId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerDId,
      hubName: 'Johar Town Sports Hub',
      contactNumber: '+92 345 8889900',
      location: 'Johar Town, Lahore',
      sports: ['football'] as Sport[],
      courtCount: 0,
    });

    // Legacy Hub Owner: profile.role === 'HUB_OWNER' without explicit user_roles table rows
    await SupabaseRepo.createProfile({
      id: legacyHubOwnerId,
      name: 'Legacy Owner',
      email: 'legacy.owner@maidaan.pk',
      role: 'HUB_OWNER',
    });
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: legacyHubOwnerId,
      hubName: 'Cantt Badminton Club',
      contactNumber: '+92 312 9990011',
      location: 'Cantt, Lahore',
      sports: ['badminton'] as Sport[],
      courtCount: 0,
    });

    await SupabaseRepo.createProfile({
      id: hubOwnerEId,
      name: 'Fresh Hub Owner',
      email: 'owner.e@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerEId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerEId,
      hubName: 'New Arena Without Courts',
      contactNumber: '+92 301 2223344',
      location: 'Faisal Town, Lahore',
      sports: ['cricket'] as Sport[],
      courtCount: 0,
    });

    let sharedCourtId: string = '';
    let ownerBCourtId: string = '';

    // =========================================================================
    // TEST 1: PLAYER cannot access Hub Dashboard API (403)
    // =========================================================================
    await test('1. PLAYER cannot access Hub Dashboard API (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: playerToken,
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    // =========================================================================
    // TEST 2: TEAM_CAPTAIN without HUB_OWNER cannot access Hub APIs (403)
    // =========================================================================
    await test('2. TEAM_CAPTAIN without HUB_OWNER cannot access Hub APIs (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: captainToken,
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);

      const resCourts = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'GET',
        token: captainToken,
      });
      assert.strictEqual(resCourts.status, 403, `Expected 403, got ${resCourts.status}`);
    });

    // =========================================================================
    // TEST 3: HUB_OWNER can access own Hub Dashboard
    // =========================================================================
    await test('3. HUB_OWNER can access own Hub Dashboard', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerAToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(res.body.hub, 'Expected hub object');
      assert.strictEqual(res.body.hub.name, 'Apex Sports Arena');
      assert.strictEqual(res.body.hub.location, 'Gulberg III, Lahore');
      assert.ok(res.body.verification, 'Expected verification object');
      assert.strictEqual(res.body.verification.status, 'NOT_SUBMITTED');
      assert.ok(res.body.courts, 'Expected courts object');
      assert.strictEqual(typeof res.body.courts.total, 'number');
    });

    // =========================================================================
    // TEST 4: Hub Owner cannot access/edit another owner's venue (403)
    // =========================================================================
    await test("4. Hub Owner cannot access/edit another owner's venue (403)", async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/profile',
        method: 'PATCH',
        token: hubOwnerAToken,
        body: {
          userId: hubOwnerBId,
          hubName: 'Attempted Hijack',
        },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);

      // Verify Owner B venue profile remains unmutated
      const ownerBProfile = await SupabaseRepo.getHubOwnerProfile(hubOwnerBId);
      assert.strictEqual(ownerBProfile?.hub_name, 'Smash Padel Complex');
    });

    // =========================================================================
    // TEST 5: Hub Owner can create own court
    // =========================================================================
    await test('5. Hub Owner can create own court', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerAToken,
        body: {
          name: 'Main Turf Pitch',
          sport: 'cricket',
          status: 'AVAILABLE',
        },
      });
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.ok(res.body.court, 'Expected court object in response');
      assert.strictEqual(res.body.court.name, 'Main Turf Pitch');
      assert.strictEqual(res.body.court.sport, 'cricket');
      assert.strictEqual(res.body.court.status, 'AVAILABLE');

      sharedCourtId = res.body.court.id;
      assert.ok(sharedCourtId, 'Expected court ID');
    });

    // =========================================================================
    // TEST 6: Hub Owner can edit own court
    // =========================================================================
    await test('6. Hub Owner can edit own court', async () => {
      const res = await makeRequest(server, {
        path: `/api/hub/courts/${sharedCourtId}`,
        method: 'PATCH',
        token: hubOwnerAToken,
        body: {
          name: 'Main Turf Pitch (Renovated)',
          status: 'LIMITED',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.court.name, 'Main Turf Pitch (Renovated)');
      assert.strictEqual(res.body.court.status, 'LIMITED');
    });

    // =========================================================================
    // TEST 7: Hub Owner cannot edit another owner's court (403)
    // =========================================================================
    await test("7. Hub Owner cannot edit another owner's court (403)", async () => {
      // Owner B creates a court
      const createRes = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerBToken,
        body: {
          name: 'Padel Glass Court 1',
          sport: 'padel',
          status: 'AVAILABLE',
        },
      });
      assert.strictEqual(createRes.status, 201);
      ownerBCourtId = createRes.body.court.id;

      // Owner A attempts to edit Owner B's court
      const res = await makeRequest(server, {
        path: `/api/hub/courts/${ownerBCourtId}`,
        method: 'PATCH',
        token: hubOwnerAToken,
        body: {
          status: 'UNAVAILABLE',
        },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);

      // Verify court status remains unchanged
      const courtCheck = await SupabaseRepo.getHubCourtById(ownerBCourtId);
      assert.strictEqual(courtCheck?.status, 'AVAILABLE');
    });

    // =========================================================================
    // TEST 8: Hub Owner can delete own court
    // =========================================================================
    await test('8. Hub Owner can delete own court', async () => {
      // Owner A creates temporary court
      const createRes = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerAToken,
        body: {
          name: 'Temporary Practice Court',
          sport: 'cricket',
          status: 'AVAILABLE',
        },
      });
      assert.strictEqual(createRes.status, 201);
      const tempId = createRes.body.court.id;

      const deleteRes = await makeRequest(server, {
        path: `/api/hub/courts/${tempId}`,
        method: 'DELETE',
        token: hubOwnerAToken,
      });
      assert.strictEqual(deleteRes.status, 200, `Expected 200, got ${deleteRes.status}`);
      assert.strictEqual(deleteRes.body.success, true);

      // Verify deletion
      const deletedCheck = await SupabaseRepo.getHubCourtById(tempId);
      assert.strictEqual(deletedCheck, null);
    });

    // =========================================================================
    // TEST 9: Invalid court sport rejected (400)
    // =========================================================================
    await test('9. Invalid court sport rejected (400)', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerAToken,
        body: {
          name: 'Olympic Pool',
          sport: 'swimming',
          status: 'AVAILABLE',
        },
      });
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    });

    // =========================================================================
    // TEST 10: Invalid availability status rejected (400)
    // =========================================================================
    await test('10. Invalid availability status rejected (400)', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerAToken,
        body: {
          name: 'Invalid Status Court',
          sport: 'cricket',
          status: 'RESERVED_CUSTOM',
        },
      });
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    });

    // =========================================================================
    // TEST 11: Court counts reflect actual court records
    // =========================================================================
    await test('11. Court counts reflect actual court records', async () => {
      // Hub Owner C starts with 0 courts
      let dashRes = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerCToken,
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(dashRes.body.courts.total, 0);
      assert.strictEqual(dashRes.body.hub.courtCount, 0);

      // Add Court 1 (AVAILABLE)
      const c1Res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerCToken,
        body: { name: 'Pitch Alpha', sport: 'cricket', status: 'AVAILABLE' },
      });
      assert.strictEqual(c1Res.status, 201);

      // Add Court 2 (AVAILABLE)
      const c2Res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerCToken,
        body: { name: 'Pitch Beta', sport: 'cricket', status: 'AVAILABLE' },
      });
      assert.strictEqual(c2Res.status, 201);

      // Add Court 3 (LIMITED)
      const c3Res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'POST',
        token: hubOwnerCToken,
        body: { name: 'Badminton Court 1', sport: 'badminton', status: 'LIMITED' },
      });
      assert.strictEqual(c3Res.status, 201);

      // Check counts on dashboard
      dashRes = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerCToken,
      });
      assert.strictEqual(dashRes.body.courts.total, 3);
      assert.strictEqual(dashRes.body.courts.available, 2);
      assert.strictEqual(dashRes.body.courts.limited, 1);
      assert.strictEqual(dashRes.body.courts.unavailable, 0);
      assert.strictEqual(dashRes.body.hub.courtCount, 3);

      // Delete Court 2
      await makeRequest(server, {
        path: `/api/hub/courts/${c2Res.body.court.id}`,
        method: 'DELETE',
        token: hubOwnerCToken,
      });

      // Verify updated count
      dashRes = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerCToken,
      });
      assert.strictEqual(dashRes.body.courts.total, 2);
      assert.strictEqual(dashRes.body.courts.available, 1);
      assert.strictEqual(dashRes.body.courts.limited, 1);
      assert.strictEqual(dashRes.body.hub.courtCount, 2);
    });

    let verificationRequestId: string = '';

    // =========================================================================
    // TEST 12: First verification submission becomes PENDING
    // =========================================================================
    await test('12. First verification submission becomes PENDING', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/verification-request',
        method: 'POST',
        token: hubOwnerAToken,
      });
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(res.body.status, 'PENDING');
      verificationRequestId = res.body.id;
      assert.ok(verificationRequestId, 'Expected request ID');

      const statusRes = await makeRequest(server, {
        path: '/api/hub/verification',
        method: 'GET',
        token: hubOwnerAToken,
      });
      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(statusRes.body.status, 'PENDING');
    });

    // =========================================================================
    // TEST 13: Second submission while PENDING creates no duplicate (409)
    // =========================================================================
    await test('13. Second submission while PENDING creates no duplicate (409)', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/verification-request',
        method: 'POST',
        token: hubOwnerAToken,
      });
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.ok(res.body.error.toLowerCase().includes('pending'));
    });

    // =========================================================================
    // TEST 14: Rejected verification returns admin note
    // =========================================================================
    await test('14. Rejected verification returns admin note', async () => {
      // Admin rejects with clear feedback note
      await SupabaseRepo.reviewHubVerification({
        requestId: verificationRequestId,
        adminId,
        action: 'REJECT',
        adminNote: 'Please provide clear photos of lighting fixtures and emergency exits.',
      });

      const res = await makeRequest(server, {
        path: '/api/hub/verification',
        method: 'GET',
        token: hubOwnerAToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'REJECTED');
      assert.strictEqual(
        res.body.adminNote,
        'Please provide clear photos of lighting fixtures and emergency exits.'
      );
    });

    // =========================================================================
    // TEST 15: Rejected venue may resubmit safely
    // =========================================================================
    await test('15. Rejected venue may resubmit safely', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/verification-request',
        method: 'POST',
        token: hubOwnerAToken,
      });
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(res.body.status, 'PENDING');
      assert.strictEqual(res.body.adminNote, null);

      verificationRequestId = res.body.id;
    });

    // =========================================================================
    // TEST 16: Approved verification results in is_verified true
    // =========================================================================
    await test('16. Approved verification results in is_verified true', async () => {
      // Admin approves
      await SupabaseRepo.reviewHubVerification({
        requestId: verificationRequestId,
        adminId,
        action: 'APPROVE',
        adminNote: 'Facility verified and approved.',
      });

      const dashRes = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerAToken,
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(dashRes.body.hub.isVerified, true);
      assert.strictEqual(dashRes.body.verification.status, 'APPROVED');

      // Attempting to submit another verification request when already approved returns 409
      const dupRes = await makeRequest(server, {
        path: '/api/hub/verification-request',
        method: 'POST',
        token: hubOwnerAToken,
      });
      assert.strictEqual(dupRes.status, 409, `Expected 409, got ${dupRes.status}`);
      assert.ok(dupRes.body.error.toLowerCase().includes('already verified'));
    });

    // =========================================================================
    // TEST 17: Client cannot manually set is_verified
    // =========================================================================
    await test('17. Client cannot manually set is_verified', async () => {
      // Owner D is unverified
      const profileBefore = await SupabaseRepo.getHubOwnerProfile(hubOwnerDId);
      assert.strictEqual(profileBefore?.is_verified, false);

      // Client sends malicious payload attempting to set is_verified: true
      const res = await makeRequest(server, {
        path: '/api/hub/profile',
        method: 'PATCH',
        token: hubOwnerDToken,
        body: {
          is_verified: true,
          isVerified: true,
          courtCount: 99,
          location: 'Johar Town Main Boulevard, Lahore',
        },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.profile.isVerified, false, 'is_verified must remain false');
      assert.strictEqual(
        res.body.profile.location,
        'Johar Town Main Boulevard, Lahore',
        'Legitimate field was updated'
      );

      // Verify database record directly
      const profileAfter = await SupabaseRepo.getHubOwnerProfile(hubOwnerDId);
      assert.strictEqual(profileAfter?.is_verified, false);
      assert.notStrictEqual(profileAfter?.court_count, 99);
    });

    // =========================================================================
    // TEST 18: activeMode alone cannot access Hub endpoints
    // =========================================================================
    await test('18. activeMode alone cannot access Hub endpoints', async () => {
      // Pure PLAYER sends header x-active-mode or body claim
      const resHeader = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: playerToken,
        headers: {
          'x-active-mode': 'HUB_OWNER',
        },
      });
      assert.strictEqual(resHeader.status, 403, `Expected 403, got ${resHeader.status}`);

      const resCourts = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'GET',
        token: playerToken,
        headers: {
          'x-active-mode': 'HUB_OWNER',
        },
      });
      assert.strictEqual(resCourts.status, 403, `Expected 403, got ${resCourts.status}`);
    });

    // =========================================================================
    // TEST 19: Existing legacy Hub Owner continues working
    // =========================================================================
    await test('19. Existing legacy Hub Owner continues working', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: legacyHubOwnerToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.hub.name, 'Cantt Badminton Club');
    });

    // =========================================================================
    // TEST 20: No dummy court/hub data appears automatically
    // =========================================================================
    await test('20. No dummy court/hub data appears automatically', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/courts',
        method: 'GET',
        token: hubOwnerEToken,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.courts), 'Expected courts array');
      assert.strictEqual(
        res.body.courts.length,
        0,
        'Expected exactly 0 courts for freshly created hub owner without synthetic dummy injection'
      );
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHubOwnerTests().catch((err) => {
  console.error('Test runner fatal failure:', err);
  process.exit(1);
});
