import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { SupabaseRepo, Role } from '../src/models/supabaseRepo.js';

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

async function runMultiRoleAuthTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN MULTI-ROLE & AUTHENTICATION TEST SUITE');
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
    // Unique test user IDs
    const normalUserId = '00000000-0000-0000-0000-000000000101';
    const normalUserToken = `test_token:${normalUserId}:normal.user@maidaan.pk`;

    const adminUserId = '00000000-0000-0000-0000-000000000001';
    const adminUserToken = `test_token:${adminUserId}:admin@maidaan.pk`;

    // 1. Initial Profile Creation defaults to PLAYER capability
    await test('1. Account Registration: Defaults to PLAYER capability', async () => {
      const initRes = await makeRequest(server, {
        path: '/api/profile/init',
        method: 'POST',
        token: normalUserToken,
        body: {
          name: 'Zaeem Athlete',
          // role omitted: defaults to PLAYER automatically
        },
      });

      assert.strictEqual(initRes.status, 200);
      assert.strictEqual(initRes.body.success, true);
      assert.strictEqual(initRes.body.user.role, 'PLAYER');
      assert.ok(Array.isArray(initRes.body.roles));
      assert.ok(initRes.body.roles.includes('PLAYER'));

      const userRoles = await SupabaseRepo.getUserRoles(normalUserId);
      assert.ok(userRoles.includes('PLAYER'));
    });

    // 2. GET /api/profile/me returns roles array and onboarding breakdown
    await test('2. Profile Response: GET /api/profile/me returns roles[] and onboarding breakdown', async () => {
      const meRes = await makeRequest(server, {
        path: '/api/profile/me',
        method: 'GET',
        token: normalUserToken,
      });

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.user.name, 'Zaeem Athlete');
      assert.ok(Array.isArray(meRes.body.roles));
      assert.deepStrictEqual(meRes.body.roles, ['PLAYER']);
      assert.strictEqual(meRes.body.onboarding.player, false);
      assert.strictEqual(meRes.body.onboarding.captain, false);
      assert.strictEqual(meRes.body.onboarding.hubOwner, false);
    });

    // 3. Authorization: Pure PLAYER cannot call TEAM_CAPTAIN match creation endpoint
    await test('3. Authorization: Pure PLAYER cannot call TEAM_CAPTAIN endpoint', async () => {
      const matchRes = await makeRequest(server, {
        path: '/api/matches',
        method: 'POST',
        token: normalUserToken,
        body: {
          title: 'Unauthorized Match',
          sport: 'cricket',
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          startTime: '18:00',
          venueName: 'Gaddafi Stadium',
          area: 'Gulberg',
          totalCapacity: 22,
          openSlots: 4,
        },
      });

      assert.strictEqual(matchRes.status, 403);
      assert.ok(matchRes.body.error.includes('Access forbidden'));
    });

    // 4. Client claiming TEAM_CAPTAIN or activeMode in headers cannot bypass server authorization
    await test('4. Security: Client activeMode claim does NOT grant authorization without server role', async () => {
      const matchRes = await makeRequest(server, {
        path: '/api/matches',
        method: 'POST',
        token: normalUserToken,
        headers: {
          'x-active-mode': 'TEAM_CAPTAIN',
          'x-user-role': 'TEAM_CAPTAIN',
        },
        body: {
          title: 'Spoofed Match',
          sport: 'cricket',
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          startTime: '18:00',
          venueName: 'Gaddafi Stadium',
          area: 'Gulberg',
          totalCapacity: 22,
          openSlots: 4,
        },
      });

      assert.strictEqual(matchRes.status, 403);
      assert.ok(matchRes.body.error.includes('Access forbidden'));
    });

    // 5. Capability Activation: Player performs Captain Setup ("Become a Captain")
    await test('5. Capability Activation: "Become a Captain" grants TEAM_CAPTAIN without new account', async () => {
      const captainSetupRes = await makeRequest(server, {
        path: '/api/profile/captain',
        method: 'PUT',
        token: normalUserToken,
        body: {
          teamName: 'Lahore Strikers',
          sports: ['cricket', 'football'],
          skillLevel: 'intermediate',
          primaryLocation: 'Model Town, Lahore',
        },
      });

      assert.strictEqual(captainSetupRes.status, 200);
      assert.strictEqual(captainSetupRes.body.success, true);
      assert.strictEqual(captainSetupRes.body.profile.teamName, 'Lahore Strikers');

      // Re-verify roles: user now has both PLAYER and TEAM_CAPTAIN on the SAME user ID
      const meRes = await makeRequest(server, {
        path: '/api/profile/me',
        method: 'GET',
        token: normalUserToken,
      });

      assert.strictEqual(meRes.status, 200);
      assert.ok(meRes.body.roles.includes('PLAYER'));
      assert.ok(meRes.body.roles.includes('TEAM_CAPTAIN'));
      assert.strictEqual(meRes.body.onboarding.captain, true);

      // Verify captain match endpoint is now accessible with same token!
      const matchRes = await makeRequest(server, {
        path: '/api/matches',
        method: 'POST',
        token: normalUserToken,
        body: {
          title: 'Strikers Friendly Match',
          sport: 'cricket',
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          startTime: '18:00',
          venueName: 'Model Town Ground',
          area: 'Model Town, Lahore',
          skillLevel: 'intermediate',
          totalCapacity: 22,
          openSlots: 4,
        },
      });

      assert.strictEqual(matchRes.status, 201);
      assert.strictEqual(matchRes.body.captainId, normalUserId);
    });

    // 6. Capability Activation: User additionally activates HUB_OWNER ("Become a Hub Owner")
    await test('6. Capability Activation: "Become a Hub Owner" grants HUB_OWNER capability', async () => {
      const hubSetupRes = await makeRequest(server, {
        path: '/api/profile/hub',
        method: 'PUT',
        token: normalUserToken,
        body: {
          hubName: 'Strikers Arena Complex',
          contactNumber: '+923001234567',
          sports: ['padel', 'cricket'],
          location: 'Gulberg, Lahore',
          courtCount: 4,
        },
      });

      assert.strictEqual(hubSetupRes.status, 200);
      assert.strictEqual(hubSetupRes.body.success, true);

      // Re-verify roles: now holds PLAYER + TEAM_CAPTAIN + HUB_OWNER
      const meRes = await makeRequest(server, {
        path: '/api/profile/me',
        method: 'GET',
        token: normalUserToken,
      });

      assert.strictEqual(meRes.status, 200);
      assert.ok(meRes.body.roles.includes('PLAYER'));
      assert.ok(meRes.body.roles.includes('TEAM_CAPTAIN'));
      assert.ok(meRes.body.roles.includes('HUB_OWNER'));
      assert.strictEqual(meRes.body.onboarding.captain, true);
      assert.strictEqual(meRes.body.onboarding.hubOwner, true);
    });

    // 7. Security: Public signup cannot claim ADMIN role
    await test('7. Security: Public registration rejects ADMIN role attempts with 403', async () => {
      const spoofId = '00000000-0000-0000-0000-000000000999';
      const spoofToken = `test_token:${spoofId}:hacker@maidaan.pk`;

      const hackerRes = await makeRequest(server, {
        path: '/api/profile/init',
        method: 'POST',
        token: spoofToken,
        body: {
          name: 'Malicious Attacker',
          role: 'ADMIN',
        },
      });

      assert.strictEqual(hackerRes.status, 403);
      assert.ok(hackerRes.body.error.includes('Administrator accounts cannot be created'));
    });

    // 8. Security: Server-assigned ADMIN role remains protected
    await test('8. Security: ADMIN endpoints require authentic server-assigned ADMIN role', async () => {
      // Seed real admin
      await SupabaseRepo.createProfile({
        id: adminUserId,
        name: 'Platform Super Admin',
        email: 'admin@maidaan.pk',
        role: 'ADMIN',
      });
      await SupabaseRepo.addRole(adminUserId, 'ADMIN');

      // Admin calling admin endpoint
      const adminRes = await makeRequest(server, {
        path: '/api/admin/hub-verifications',
        method: 'GET',
        token: adminUserToken,
      });
      assert.strictEqual(adminRes.status, 200);

      // Normal multi-role user (PLAYER+CAPTAIN+HUB) calling admin endpoint -> 403 Forbidden
      const deniedRes = await makeRequest(server, {
        path: '/api/admin/hub-verifications',
        method: 'GET',
        token: normalUserToken,
      });
      assert.strictEqual(deniedRes.status, 403);
    });

    // 9. Existing user backward compatibility: Existing single-role users retain capabilities
    await test('9. Backward Compatibility: Existing profiles.role gracefully maps to capabilities', async () => {
      const legacyCaptainId = '00000000-0000-0000-0000-000000000077';
      // Simulate existing legacy profile created before multi-role migration
      await SupabaseRepo.createProfile({
        id: legacyCaptainId,
        name: 'Legacy Captain',
        email: 'legacy.captain@maidaan.pk',
        role: 'TEAM_CAPTAIN',
      });

      const roles = await SupabaseRepo.getUserRoles(legacyCaptainId);
      assert.ok(roles.includes('TEAM_CAPTAIN'));
      assert.ok(roles.includes('PLAYER'), 'Existing captain must also have PLAYER capability');
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

runMultiRoleAuthTests().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
