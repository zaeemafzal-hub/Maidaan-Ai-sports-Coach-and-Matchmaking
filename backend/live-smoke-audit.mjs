import { supabaseAdmin } from './dist/lib/supabase.js';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function runLiveSmokeAudit() {
  console.log('====================================================');
  console.log('   MAIDAAN PHASE 8A — LIVE END-TO-END SMOKE TEST   ');
  console.log('       (Testing against Real Supabase DB)          ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const ts = Date.now();

  console.log('--- Step 0: Create Auth Users in Supabase Auth ---');
  const { data: capUser, error: capErr } = await supabaseAdmin.auth.admin.createUser({
    email: `smoke_captain_${ts}@maidaan.pk`,
    password: 'Password123!',
    email_confirm: true,
  });
  if (capErr) throw capErr;
  const captainId = capUser.user.id;

  const { data: plyUser, error: plyErr } = await supabaseAdmin.auth.admin.createUser({
    email: `smoke_player_${ts}@maidaan.pk`,
    password: 'Password123!',
    email_confirm: true,
  });
  if (plyErr) throw plyErr;
  const playerId = plyUser.user.id;

  const { data: hubUser, error: hubErr } = await supabaseAdmin.auth.admin.createUser({
    email: `smoke_hub_${ts}@maidaan.pk`,
    password: 'Password123!',
    email_confirm: true,
  });
  if (hubErr) throw hubErr;
  const hubOwnerId = hubUser.user.id;

  const adminId = '0a3f23fd-ef05-4bc3-9b46-f35723651a84'; // Seeded Live Admin in Supabase

  const captainToken = `test_token:${captainId}:smoke_captain_${ts}@maidaan.pk`;
  const playerToken = `test_token:${playerId}:smoke_player_${ts}@maidaan.pk`;
  const hubToken = `test_token:${hubOwnerId}:smoke_hub_${ts}@maidaan.pk`;
  const adminToken = `test_token:${adminId}:admin@maidaan.pk`;

  console.log('\n--- Step 1: Initialize User Profiles & Setup in Supabase ---');
  // 1. Captain init & profile setup
  const capRes = await fetch(`${API_URL}/profile/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({ name: `Captain ${ts}`, role: 'TEAM_CAPTAIN' }),
  });
  const capData = await capRes.json();
  assert(capRes.status === 200 && capData.user?.role === 'TEAM_CAPTAIN', 'Captain profile initialized in Supabase');

  const capSetupRes = await fetch(`${API_URL}/profile/captain`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({
      teamName: `Lahore Qalandars ${ts}`,
      sports: ['cricket'],
      skillLevel: 'intermediate',
      primaryLocation: 'Lahore Cantt',
    }),
  });
  const capSetupData = await capSetupRes.json();
  assert(capSetupRes.status === 200 && capSetupData.success, 'Captain profile setup completed');

  // 2. Player init & profile setup
  const plyRes = await fetch(`${API_URL}/profile/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({ name: `Player ${ts}`, role: 'PLAYER' }),
  });
  const plyData = await plyRes.json();
  assert(plyRes.status === 200 && plyData.user?.role === 'PLAYER', 'Player profile initialized in Supabase');

  const plySetupRes = await fetch(`${API_URL}/profile/player`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({
      preferredSports: ['cricket'],
      skillLevel: 'intermediate',
      primaryLocation: 'Gulberg',
    }),
  });
  const plySetupData = await plySetupRes.json();
  assert(plySetupRes.status === 200 && plySetupData.success, 'Player profile setup completed');

  // 3. Hub Owner init & profile setup
  const hubRes = await fetch(`${API_URL}/profile/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({ name: `Hub Owner ${ts}`, role: 'HUB_OWNER' }),
  });
  const hubData = await hubRes.json();
  assert(hubRes.status === 200 && hubData.user?.role === 'HUB_OWNER', 'Hub Owner profile initialized in Supabase');

  const hubSetupRes = await fetch(`${API_URL}/profile/hub`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({
      hubName: `Maidaan Arena ${ts}`,
      location: 'Gulberg III, Lahore',
      courtsCount: 2,
      contactNumber: '+923001234567',
      sports: ['cricket', 'padel'],
    }),
  });
  const hubSetupData = await hubSetupRes.json();
  assert(hubSetupRes.status === 200 && hubSetupData.success, 'Hub Owner setup completed');

  console.log('\n--- Step 2: Match Lifecycle (Create -> Discover -> Request -> Accept) ---');
  // Captain creates match
  const matchRes = await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({
      sport: 'cricket',
      title: `Smoke Test Match ${ts}`,
      format: 'T20',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '18:00',
      venueName: 'National Cricket Arena',
      area: 'Lahore Cantt',
      skillLevel: 'intermediate',
      totalCapacity: 11,
      openSlots: 2,
      contributionPerPlayer: 500,
    }),
  });
  const matchData = await matchRes.json();
  const matchId = matchData.id || matchData.match?.id;
  assert(matchRes.status === 201 && !!matchId, 'Captain created match successfully in Supabase');

  // Player discovers match
  const discRes = await fetch(`${API_URL}/matches?sport=cricket`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  });
  const discData = await discRes.json();
  const foundMatch = discData.matches?.find(m => m.id === matchId);
  assert(discRes.status === 200 && !!foundMatch, 'Player discovered newly created match in listings');

  // Player sends join request
  const reqRes = await fetch(`${API_URL}/matches/${matchId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({ message: 'Can I join as middle-order batsman?' }),
  });
  const reqData = await reqRes.json();
  const requestId = reqData.id || reqData.request?.id;
  assert(reqRes.status === 201 && !!requestId, 'Player sent join request');

  // Captain retrieves join requests
  const capReqRes = await fetch(`${API_URL}/matches/${matchId}/requests`, {
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  const capReqData = await capReqRes.json();
  const foundReq = capReqData.requests?.find(r => r.id === requestId);
  assert(capReqRes.status === 200 && !!foundReq, 'Captain received join request');

  // Captain accepts request
  const accRes = await fetch(`${API_URL}/join-requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({ action: 'ACCEPT' }),
  });
  const accData = await accRes.json();
  assert(accRes.status === 200 && accData.request?.status === 'ACCEPTED', 'Captain accepted join request');

  // Player receives notification
  const notifRes = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  });
  const notifData = await notifRes.json();
  const foundNotif = notifData.notifications?.find(n => n.matchId === matchId && n.type === 'JOIN_REQUEST_ACCEPTED');
  assert(
    notifRes.status === 200 && !!foundNotif,
    'Player received notification for match acceptance'
  );

  console.log('\n--- Step 3: Match Group Chat & Realtime Socket.IO ---');
  // Lazily get or create match group room
  const groupRoomRes = await fetch(`${API_URL}/chat/matches/${matchId}/room`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerToken}` },
  });
  const groupRoomData = await groupRoomRes.json();
  const roomId = groupRoomData.room?.id;
  assert(groupRoomRes.status >= 200 && groupRoomRes.status < 300 && !!roomId, `Match group chat room resolved (${roomId})`);

  // Socket.IO realtime connection & message exchange
  const socketP = new Promise((resolve) => {
    const socketPlayer = io(SOCKET_URL, {
      auth: { token: playerToken },
      transports: ['websocket'],
    });

    let playerReceived = false;

    socketPlayer.on('connect', () => {
      socketPlayer.emit('chat:join-room', { roomId }, async () => {
        // Once joined, captain posts message via API
        setTimeout(async () => {
          await fetch(`${API_URL}/chat/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${captainToken}`,
            },
            body: JSON.stringify({
              body: 'Welcome to the team for the smoke test!',
            }),
          });
        }, 500);
      });
    });

    socketPlayer.on('chat:message', (msg) => {
      if (msg.body && msg.body.includes('Welcome to the team')) {
        playerReceived = true;
        socketPlayer.disconnect();
        resolve(true);
      }
    });

    setTimeout(() => {
      socketPlayer.disconnect();
      resolve(playerReceived);
    }, 6000);
  });

  const socketOk = await socketP;
  assert(socketOk, 'Realtime Socket.IO chat message exchanged between Captain and Player');

  console.log('\n--- Step 4: Live NVIDIA AI Coach Query ---');
  const coachRes = await fetch(`${API_URL}/coach/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({
      sport: 'cricket',
      message: 'Give me a simple batting timing drill.',
    }),
  });
  const coachData = await coachRes.json();
  console.log('Coach status:', coachRes.status, 'Data:', coachData);
  assert(
    coachRes.status === 200 &&
    coachData.message &&
    coachData.message.length > 20 &&
    coachData.sport === 'cricket' &&
    coachData.provider === 'nvidia',
    `Live AI Coach returned verified NVIDIA NIM response (Length: ${coachData.message?.length || 0})`
  );

  console.log('\n--- Step 5: Hub Owner Court & Verification Request -> Admin Approval ---');
  // Hub Owner creates court
  const courtRes = await fetch(`${API_URL}/hub/courts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({
      name: `Court 1 - Covered Padel ${ts}`,
      sport: 'padel',
      status: 'AVAILABLE',
    }),
  });
  const courtData = await courtRes.json();
  assert(courtRes.status === 201 && courtData.court?.id, 'Hub Owner created court in Supabase');

  // Hub Owner submits verification request
  const verifReqRes = await fetch(`${API_URL}/hub/verification-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({}),
  });
  const verifReqData = await verifReqRes.json();
  const verifId = verifReqData.id;
  assert(verifReqRes.status === 201 && !!verifId, 'Hub Owner submitted verification request');

  // Admin approves verification request
  const adminApproveRes = await fetch(`${API_URL}/admin/hub-verifications/${verifId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'APPROVE', adminNote: 'Verified during smoke test' }),
  });
  const adminApproveData = await adminApproveRes.json();
  assert(
    adminApproveRes.status === 200 &&
    adminApproveData.request?.status === 'APPROVED',
    'Admin successfully approved Hub verification request'
  );

  console.log('\n--- Step 6: Player Report Submission -> Admin Review & Resolution ---');
  // Player submits report
  const repRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({
      category: 'CONDUCT',
      reportedUserId: captainId,
      description: 'Smoke test report for conduct auditing.',
    }),
  });
  const repData = await repRes.json();
  const reportId = repData.id;
  assert(repRes.status === 201 && !!reportId, 'Player submitted user report in Supabase');

  // Admin reviews & resolves report
  const adminRepRes = await fetch(`${API_URL}/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'RESOLVE',
      adminNote: 'Report investigated and resolved via automated audit.',
    }),
  });
  const adminRepData = await adminRepRes.json();
  assert(
    adminRepRes.status === 200 && adminRepData.report?.status === 'RESOLVED',
    'Admin successfully reviewed and resolved conduct report'
  );

  console.log('\n====================================================');
  console.log(`LIVE SMOKE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runLiveSmokeAudit().catch((err) => {
  console.error('Fatal error during live smoke audit:', err);
  process.exit(1);
});
