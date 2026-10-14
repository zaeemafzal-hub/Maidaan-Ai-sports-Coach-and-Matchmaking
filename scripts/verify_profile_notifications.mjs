// verify_profile_notifications.mjs
const BACKEND_URL = 'http://localhost:5000';

async function run() {
  console.log('=== VERIFYING PROFILE & NOTIFICATIONS FIXES ===\n');

  // Generate a random UUID-like user id
  const randomUuid = 'd3b07384-d113-469b-986a-773a9856ef90';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test_token:${randomUuid}:uuid.athlete%40maidaan.pk`
  };

  // 1. GET /api/notifications
  console.log('[1] Testing GET /api/notifications...');
  const notifRes = await fetch(`${BACKEND_URL}/api/notifications`, {
    headers
  });
  console.log(`GET /api/notifications status: ${notifRes.status}`);
  const notifData = await notifRes.json();
  console.log('Notifications count:', Array.isArray(notifData) ? notifData.length : notifData);
  if (notifRes.status !== 200) {
    throw new Error(`Notifications test failed with status ${notifRes.status}`);
  }
  console.log('-> Notifications test PASSED\n');

  // 2. PUT /api/profile/player
  console.log('[2] Testing PUT /api/profile/player with UUID token (formerly foreign key error)...');
  const profilePayload = {
    preferredSports: ['cricket', 'padel'],
    skillLevel: 'intermediate',
    primaryLocation: 'Lahore Sports Complex'
  };

  const profileRes = await fetch(`${BACKEND_URL}/api/profile/player`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profilePayload)
  });
  console.log(`PUT /api/profile/player status: ${profileRes.status}`);
  const profileData = await profileRes.json();
  console.log('Profile response:', profileData);
  if (profileRes.status !== 200) {
    throw new Error(`Profile update failed with status ${profileRes.status}`);
  }
  console.log('-> Player profile test PASSED\n');

  // 3. GET /api/profile/me
  console.log('[3] Testing GET /api/profile/me...');
  const meRes = await fetch(`${BACKEND_URL}/api/profile/me`, {
    headers
  });
  console.log(`GET /api/profile/me status: ${meRes.status}`);
  const meData = await meRes.json();
  console.log('Me profile response:', meData);
  if (meRes.status !== 200) {
    throw new Error(`Profile me failed with status ${meRes.status}`);
  }
  console.log('-> GET profile me test PASSED\n');

  // 4. GET /api/profile/me without token -> should be 401
  console.log('[4] Testing GET /api/profile/me without token (expecting 401)...');
  const unauthRes = await fetch(`${BACKEND_URL}/api/profile/me`);
  console.log(`Unauth status: ${unauthRes.status}`);
  if (unauthRes.status === 401) {
    console.log('-> Correctly rejected with 401 Unauthorized\n');
  } else {
    throw new Error(`Expected 401, got ${unauthRes.status}`);
  }

  console.log('=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
