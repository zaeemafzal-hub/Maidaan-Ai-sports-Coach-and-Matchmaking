import http from 'http';
import fs from 'fs';
import path from 'path';

// Load backend/.env
const rootDir = process.cwd();
const backendEnvPath = path.join(rootDir, 'backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const envLines = fs.readFileSync(backendEnvPath, 'utf8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

function request(urlStr, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== TEST 1: Signed-out request to Metro /api/profile/player ===');
  const res1 = await request('http://localhost:8081/api/profile/player', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ preferredSports: ['Cricket'], skillLevel: 'Intermediate', primaryLocation: 'Lahore' }));
  console.log('Signed-out status:', res1.status);
  console.log('Signed-out body:', res1.body);

  if (res1.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for signed-out request, got ${res1.status}`);
  }

  console.log('\n=== TEST 2: Real Supabase Auth login ===');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'player.demo@maidaan.pk',
    password: 'Password123!'
  });
  if (authError || !authData?.session?.access_token) {
    throw new Error('Supabase login failed: ' + JSON.stringify(authError));
  }
  const token = authData.session.access_token;
  console.log('Supabase token obtained successfully for user ID:', authData.user.id);

  console.log('\n=== TEST 3: Authenticated PUT /api/profile/player through Metro (:8081) ===');
  const playerPayload = {
    preferredSports: ['cricket', 'padel', 'football', 'badminton'],
    skillLevel: 'advanced',
    primaryLocation: 'Lahore Garrison Polo Club'
  };
  const res3 = await request('http://localhost:8081/api/profile/player', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  }, JSON.stringify(playerPayload));
  console.log('PUT status:', res3.status);
  console.log('PUT body:', res3.body);

  if (res3.status !== 200) {
    throw new Error(`Expected 200 OK for authenticated profile PUT, got ${res3.status}`);
  }

  console.log('\n=== TEST 4: Profile Persistence on reload GET /api/profile/me through Metro (:8081) ===');
  const res4 = await request('http://localhost:8081/api/profile/me', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  console.log('GET status:', res4.status);
  console.log('GET body:', res4.body);

  if (res4.status !== 200) {
    throw new Error(`Expected 200 OK for profile reload GET, got ${res4.status}`);
  }

  const data = JSON.parse(res4.body);
  if (!data.user?.onboardingCompleted) {
    throw new Error('Expected data.user.onboardingCompleted to be true after profile setup');
  }

  console.log('\n=== TEST 5: Mock / Social Token PUT /api/profile/player through Metro (:8081) ===');
  const mockToken = 'test_token:usr_mock_test_456:mock.player%40maidaan.pk';
  
  // Initialize mock profile role in backend as done by authService.socialLogin
  await request('http://localhost:8081/api/profile/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + mockToken
    }
  }, JSON.stringify({ name: 'Mock Player', role: 'PLAYER' }));

  const res5 = await request('http://localhost:8081/api/profile/player', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + mockToken
    }
  }, JSON.stringify(playerPayload));
  console.log('Mock PUT status:', res5.status);
  console.log('Mock PUT body:', res5.body);

  if (res5.status !== 200) {
    throw new Error(`Expected 200 OK for mock token profile PUT, got ${res5.status}`);
  }

  console.log('\n>>> ALL 5 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
