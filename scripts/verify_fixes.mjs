// Test script to verify the 3 endpoints: chat/rooms, coach/chat, and matches/:id/join
async function run() {
  console.log('=== STARTING MAIDAAN FIXES VERIFICATION ===\n');

  // Test UUID user and legacy user
  const uuidUserId = 'd3b07384-d113-469b-986a-773a9856ef90';
  const legacyUserId = 'usr_google_1791990298605';
  
  const uuidToken = `test_token:${uuidUserId}:uuid.athlete%40maidaan.pk`;
  const legacyToken = `test_token:${legacyUserId}:google.athlete%40maidaan.pk`;

  const baseUrl = 'http://127.0.0.1:8081';

  // Test 1: GET /api/chat/rooms with legacy token
  console.log('[Test 1A] Testing GET /api/chat/rooms with legacy non-UUID token...');
  const resRoomsLegacy = await fetch(`${baseUrl}/api/chat/rooms`, {
    headers: { Authorization: `Bearer ${legacyToken}` },
  });
  console.log(`Status: ${resRoomsLegacy.status}`);
  const roomsLegacyData = await resRoomsLegacy.json();
  console.log('Rooms legacy response:', roomsLegacyData);
  if (resRoomsLegacy.status !== 200) {
    throw new Error(`Test 1A Failed with status ${resRoomsLegacy.status}`);
  }
  console.log('Test 1A PASSED (HTTP 200 OK)\n');

  // Test 1B: GET /api/chat/rooms with UUID token
  console.log('[Test 1B] Testing GET /api/chat/rooms with UUID token...');
  const resRoomsUuid = await fetch(`${baseUrl}/api/chat/rooms`, {
    headers: { Authorization: `Bearer ${uuidToken}` },
  });
  console.log(`Status: ${resRoomsUuid.status}`);
  const roomsUuidData = await resRoomsUuid.json();
  console.log('Rooms UUID response count:', roomsUuidData.length);
  if (resRoomsUuid.status !== 200) {
    throw new Error(`Test 1B Failed with status ${resRoomsUuid.status}`);
  }
  console.log('Test 1B PASSED (HTTP 200 OK)\n');

  // Test 2: POST /api/coach/chat with NVIDIA NIM
  console.log('[Test 2] Testing POST /api/coach/chat with NVIDIA NIM provider...');
  const coachStart = Date.now();
  const resCoach = await fetch(`${baseUrl}/api/coach/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${uuidToken}`,
    },
    body: JSON.stringify({
      sport: 'cricket',
      message: 'What is the correct follow-through when playing a cover drive?',
    }),
  });
  const coachDuration = ((Date.now() - coachStart) / 1000).toFixed(2);
  console.log(`Status: ${resCoach.status} (took ${coachDuration}s)`);
  const coachData = await resCoach.json();
  console.log('Coach Response:', {
    provider: coachData.provider,
    sport: coachData.sport,
    messageSample: coachData.message?.substring(0, 160) + '...',
  });
  if (resCoach.status !== 200 || !coachData.message) {
    throw new Error(`Test 2 Failed: ${JSON.stringify(coachData)}`);
  }
  console.log('Test 2 PASSED (HTTP 200 OK)\n');

  // Test 3: POST /api/matches/:id/join
  // First, fetch available matches
  console.log('[Test 3] Testing POST /api/matches/:id/join...');
  const resMatches = await fetch(`${baseUrl}/api/matches`, {
    headers: { Authorization: `Bearer ${uuidToken}` },
  });
  const matchesData = await resMatches.json();
  const matchList = Array.isArray(matchesData) ? matchesData : (matchesData.matches || []);
  if (!matchList || matchList.length === 0) {
    throw new Error('No matches returned to test join request');
  }
  const targetMatch = matchList[0];
  console.log(`Target match ID: ${targetMatch.id} (${targetMatch.title})`);

  // Initialize profile with role PLAYER
  await fetch(`${baseUrl}/api/profile/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${legacyToken}`,
    },
    body: JSON.stringify({ name: 'Google Athlete', role: 'PLAYER' }),
  });

  await fetch(`${baseUrl}/api/profile/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${uuidToken}`,
    },
    body: JSON.stringify({ name: 'UUID Athlete', role: 'PLAYER' }),
  });

  // Try join request with legacy user
  const resJoinLegacy = await fetch(`${baseUrl}/api/matches/${targetMatch.id}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${legacyToken}`,
    },
    body: JSON.stringify({
      message: 'Looking forward to playing!',
    }),
  });
  console.log(`Join with legacy token status: ${resJoinLegacy.status}`);
  const joinLegacyData = await resJoinLegacy.json();
  console.log('Join response:', joinLegacyData);
  if (resJoinLegacy.status !== 200 && resJoinLegacy.status !== 201) {
    throw new Error(`Test 3A Failed: ${JSON.stringify(joinLegacyData)}`);
  }
  console.log('Test 3A PASSED\n');

  // Try join request with UUID user
  const resJoinUuid = await fetch(`${baseUrl}/api/matches/${targetMatch.id}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${uuidToken}`,
    },
    body: JSON.stringify({
      message: 'Count me in for this fixture!',
    }),
  });
  console.log(`Join with UUID token status: ${resJoinUuid.status}`);
  const joinUuidData = await resJoinUuid.json();
  console.log('Join response:', joinUuidData);
  if (resJoinUuid.status !== 200 && resJoinUuid.status !== 201) {
    throw new Error(`Test 3B Failed: ${JSON.stringify(joinUuidData)}`);
  }
  console.log('Test 3B PASSED\n');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
