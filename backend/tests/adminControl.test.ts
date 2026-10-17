import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { SupabaseRepo, Sport } from '../src/models/supabaseRepo.js';

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

async function runAdminControlTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN ADMIN CONTROL & MODERATION TEST SUITE');
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
    const adminUserId = '00000000-0000-0000-0000-000000000401';
    const adminToken = `test_token:${adminUserId}:superadmin@maidaan.pk`;

    const playerUserId = '00000000-0000-0000-0000-000000000402';
    const playerToken = `test_token:${playerUserId}:regularplayer@maidaan.pk`;

    const captainUserId = '00000000-0000-0000-0000-000000000403';
    const captainToken = `test_token:${captainUserId}:teamcaptain@maidaan.pk`;

    const hubOwnerUserId = '00000000-0000-0000-0000-000000000404';
    const hubOwnerToken = `test_token:${hubOwnerUserId}:venueowner@maidaan.pk`;

    const targetUserId = '00000000-0000-0000-0000-000000000405';

    // 0. Bootstrap profiles and capabilities
    await SupabaseRepo.createProfile({
      id: adminUserId,
      name: 'Platform SuperAdmin',
      email: 'superadmin@maidaan.pk',
      role: 'ADMIN',
    });
    await SupabaseRepo.addRole(adminUserId, 'ADMIN');

    await SupabaseRepo.createProfile({
      id: playerUserId,
      name: 'Player One',
      email: 'regularplayer@maidaan.pk',
      role: 'PLAYER',
    });

    await SupabaseRepo.createProfile({
      id: captainUserId,
      name: 'Captain Rizwan',
      email: 'teamcaptain@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(captainUserId, 'TEAM_CAPTAIN');

    await SupabaseRepo.createProfile({
      id: hubOwnerUserId,
      name: 'Hub Owner Hamza',
      email: 'venueowner@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(hubOwnerUserId, 'HUB_OWNER');
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: hubOwnerUserId,
      hubName: 'Liberty Badminton Center',
      location: 'Gulberg, Lahore',
      contactNumber: '+92 300 9988776',
      sports: ['badminton'] as Sport[],
      courtCount: 2,
    });

    await SupabaseRepo.createProfile({
      id: targetUserId,
      name: 'Reported Player',
      email: 'reported@maidaan.pk',
      role: 'PLAYER',
    });

    // Create an initial hub verification request for Hub Owner Hamza
    const verifRequest = await SupabaseRepo.createHubVerificationRequest(hubOwnerUserId);

    // Create an initial report for testing
    const initialReport = await SupabaseRepo.createReport({
      reporterId: playerUserId,
      reportedUserId: targetUserId,
      category: 'CONDUCT',
      description: 'Used abusive language on the pitch after cancellation.',
    });

    let sharedVerifId = verifRequest.id;
    let sharedReportId = initialReport.id;

    // =========================================================================
    // 30. TESTS — ADMIN RBAC
    // =========================================================================

    await test('1. PLAYER cannot access admin dashboard API (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/dashboard',
        method: 'GET',
        token: playerToken,
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('2. TEAM_CAPTAIN cannot access admin APIs (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/hub-verifications',
        method: 'GET',
        token: captainToken,
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('3. HUB_OWNER cannot access admin APIs (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/reports',
        method: 'GET',
        token: hubOwnerToken,
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('4. ADMIN can access dashboard (200)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/dashboard',
        method: 'GET',
        token: adminToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(res.body.users, 'Expected users object');
      assert.ok(res.body.matches, 'Expected matches object');
      assert.ok(res.body.hubs, 'Expected hubs object');
      assert.ok(res.body.reports, 'Expected reports object');
      assert.strictEqual(typeof res.body.users.total, 'number');
      assert.strictEqual(typeof res.body.hubs.total, 'number');
      assert.strictEqual(typeof res.body.hubs.pendingVerification, 'number');
    });

    await test('5. Client activeMode ADMIN without role is denied (403)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/dashboard',
        method: 'GET',
        token: playerToken,
        headers: {
          'x-active-mode': 'ADMIN',
        },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('6. Public signup cannot grant ADMIN (403)', async () => {
      const hackerUserId = '00000000-0000-0000-0000-000000000499';
      const hackerToken = `test_token:${hackerUserId}:hacker@maidaan.pk`;
      const res = await makeRequest(server, {
        path: '/api/profile/init',
        method: 'POST',
        token: hackerToken,
        body: {
          name: 'Hacker Admin',
          role: 'ADMIN',
        },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
      assert.ok(res.body.error.toLowerCase().includes('administrator'));
    });

    // =========================================================================
    // 31. TESTS — HUB VERIFICATION
    // =========================================================================

    await test('7. ADMIN sees pending verification', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/hub-verifications?status=PENDING',
        method: 'GET',
        token: adminToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(Array.isArray(res.body.requests), 'Expected requests array');
      const found = res.body.requests.find((r: any) => r.requestId === sharedVerifId);
      assert.ok(found, 'Expected to find pending verification request in queue');
      assert.strictEqual(found.status, 'PENDING');
      assert.strictEqual(found.hubName, 'Liberty Badminton Center');
    });

    await test('8. ADMIN rejects request with note', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/hub-verifications/${sharedVerifId}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          action: 'REJECT',
          adminNote: 'Please provide high-resolution court lighting photos.',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.request.status, 'REJECTED');
      assert.strictEqual(
        res.body.request.adminNote,
        'Please provide high-resolution court lighting photos.'
      );
    });

    await test('9. Rejected request keeps is_verified false', async () => {
      const profile = await SupabaseRepo.getHubOwnerProfile(hubOwnerUserId);
      assert.strictEqual(profile?.is_verified, false, 'is_verified must remain false on rejection');
    });

    await test('10. Already rejected request cannot be processed again (409)', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/hub-verifications/${sharedVerifId}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          action: 'APPROVE',
        },
      });
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.ok(res.body.error.toLowerCase().includes('cannot review request with status'));
    });

    await test('11. Hub Owner sees updated status after admin decision', async () => {
      const res = await makeRequest(server, {
        path: '/api/hub/verification',
        method: 'GET',
        token: hubOwnerToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'REJECTED');
      assert.strictEqual(
        res.body.adminNote,
        'Please provide high-resolution court lighting photos.'
      );
    });

    await test('12. Non-admin cannot approve (403)', async () => {
      // Hub Owner resubmits to create a new PENDING request
      const resubmit = await makeRequest(server, {
        path: '/api/hub/verification-request',
        method: 'POST',
        token: hubOwnerToken,
      });
      assert.strictEqual(resubmit.status, 201);
      sharedVerifId = resubmit.body.id;

      // Regular player attempts to approve
      const res = await makeRequest(server, {
        path: `/api/admin/hub-verifications/${sharedVerifId}`,
        method: 'PATCH',
        token: playerToken,
        body: { action: 'APPROVE' },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('13. ADMIN approves PENDING request', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/hub-verifications/${sharedVerifId}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          status: 'APPROVED', // Tests status alias for action
          adminNote: 'Facility verified and approved for play.',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.request.status, 'APPROVED');
    });

    await test('14. Approved request sets is_verified true', async () => {
      const profile = await SupabaseRepo.getHubOwnerProfile(hubOwnerUserId);
      assert.strictEqual(profile?.is_verified, true, 'is_verified must be true after approval');

      // Hub Owner dashboard also reflects isVerified: true
      const ownerDash = await makeRequest(server, {
        path: '/api/hub/dashboard',
        method: 'GET',
        token: hubOwnerToken,
      });
      assert.strictEqual(ownerDash.body.hub.isVerified, true);
    });

    await test('15. Already approved request cannot be processed again (409)', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/hub-verifications/${sharedVerifId}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          action: 'REJECT',
        },
      });
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.ok(res.body.error.toLowerCase().includes('cannot review request with status'));
    });

    // =========================================================================
    // 32. TESTS — REPORT MODERATION
    // =========================================================================

    await test('16. ADMIN sees open reports', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/reports?status=OPEN',
        method: 'GET',
        token: adminToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(Array.isArray(res.body.reports), 'Expected reports array');
      const found = res.body.reports.find(
        (r: any) => r.id === sharedReportId || r.reportId === sharedReportId
      );
      assert.ok(found, 'Expected to find open report');
      assert.strictEqual(found.status, 'OPEN');
      assert.strictEqual(found.category, 'CONDUCT');
    });

    await test('17. Non-admin cannot moderate report (403)', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/reports/${sharedReportId}`,
        method: 'PATCH',
        token: playerToken,
        body: { action: 'RESOLVE' },
      });
      assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    });

    await test('18. Invalid report ID handled safely (404)', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/reports/00000000-0000-0000-0000-000000000999',
        method: 'PATCH',
        token: adminToken,
        body: { action: 'RESOLVE' },
      });
      assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    });

    await test('19. ADMIN resolves report', async () => {
      const res = await makeRequest(server, {
        path: `/api/admin/reports/${sharedReportId}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          action: 'RESOLVE',
          adminNote: 'Warning issued to reported player under fair play guidelines.',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.report.status, 'RESOLVED');
      assert.strictEqual(
        res.body.report.adminNote,
        'Warning issued to reported player under fair play guidelines.'
      );
    });

    await test('20. Invalid status transition rejected (409)', async () => {
      // Attempting to resolve or dismiss an already RESOLVED report
      const res = await makeRequest(server, {
        path: `/api/admin/reports/${sharedReportId}`,
        method: 'PATCH',
        token: adminToken,
        body: { action: 'DISMISS' },
      });
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.ok(res.body.error.toLowerCase().includes('already finalized'));
    });

    await test('21. ADMIN dismisses report', async () => {
      // Create a secondary report to test DISMISS action
      const report2 = await SupabaseRepo.createReport({
        reporterId: playerUserId,
        reportedUserId: targetUserId,
        category: 'SPAM',
        description: 'Sent duplicate friendly match request message.',
      });

      const res = await makeRequest(server, {
        path: `/api/admin/reports/${report2.id}`,
        method: 'PATCH',
        token: adminToken,
        body: {
          status: 'DISMISSED',
          adminNote: 'Determined to be an accidental resend. No rule violation.',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.report.status, 'DISMISSED');
    });

    await test('22. GET /api/admin/hubs returns registered venues with verification filter', async () => {
      const res = await makeRequest(server, {
        path: '/api/admin/hubs?status=VERIFIED',
        method: 'GET',
        token: adminToken,
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(Array.isArray(res.body.hubs), 'Expected hubs array');
      const found = res.body.hubs.find((h: any) => h.userId === hubOwnerUserId);
      assert.ok(found, 'Approved hub should be found in verified hubs filter');
      assert.strictEqual(found.isVerified, true);
      assert.strictEqual(found.hubName, 'Liberty Badminton Center');
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

runAdminControlTests().catch((err) => {
  console.error('Admin test runner fatal failure:', err);
  process.exit(1);
});
