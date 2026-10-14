import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function verifyDemoCoreFlow() {
  console.log('====================================================');
  console.log('   MAIDAAN — CORE DEMO FLOW PERSISTED VERIFICATION  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  const ts = Date.now();

  // Using the persisted seeded demo accounts
  const captainId = 'c7d0eab7-d0b5-42d7-88ba-3c54628589bb';
  const playerId = '2cc17d8e-ae3b-43c6-af74-a50c91ddff74';

  const captainToken = `test_token:${captainId}:captain.demo@maidaan.pk`;
  const playerToken = `test_token:${playerId}:player.demo@maidaan.pk`;

  console.log('--- Step 1: Captain Logs In & Creates Match ---');
  // Captain checks profile
  const capMe = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${captainToken}` },
  }).then((r) => r.json());
  assert(capMe.user?.role === 'TEAM_CAPTAIN', 'Captain verified role TEAM_CAPTAIN');

  // Captain creates match
  const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const createMatchRes = await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({
      sport: 'cricket',
      title: `Live Demo Match ${ts}`,
      format: 'Tape-Ball T20',
      date: tmrw,
      startTime: '20:30',
      venueName: 'Lahore Gymkhana Ground',
      area: 'Upper Mall, Lahore',
      skillLevel: 'intermediate',
      totalCapacity: 12,
      openSlots: 2,
      contributionPerPlayer: 500,
      notes: 'Demo match for FYP Presentation.',
    }),
  });
  const matchData = await createMatchRes.json();
  const matchId = matchData.id;
  assert(createMatchRes.status === 201 && !!matchId, `Match created successfully (${matchId})`);

  console.log('\n--- Step 2: Player Discovers Match & Sends Join Request ---');
  // Player checks profile
  const plyMe = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  }).then((r) => r.json());
  assert(plyMe.user?.role === 'PLAYER', 'Player verified role PLAYER');

  // Player discovers match
  const discoverRes = await fetch(`${API_URL}/matches?sport=cricket`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  });
  const discoverData = await discoverRes.json();
  const matchFound = discoverData.matches?.find((m) => m.id === matchId);
  assert(discoverRes.status === 200 && !!matchFound, 'Player discovered match in listings');

  // Player sends join request
  const reqRes = await fetch(`${API_URL}/matches/${matchId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({ message: 'Can I join as wicket-keeper batsman for demo?' }),
  });
  const reqData = await reqRes.json();
  const requestId = reqData.id;
  assert(reqRes.status === 201 && !!requestId, `Join request submitted (${requestId})`);

  console.log('\n--- Step 3: Captain Views & Accepts Join Request ---');
  const capViewReqs = await fetch(`${API_URL}/matches/${matchId}/requests`, {
    headers: { Authorization: `Bearer ${captainToken}` },
  }).then((r) => r.json());
  const foundInCapList = capViewReqs.requests?.find((r) => r.id === requestId);
  assert(!!foundInCapList, 'Captain retrieved player request in match request list');

  const acceptRes = await fetch(`${API_URL}/join-requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({ action: 'ACCEPT' }),
  });
  const acceptData = await acceptRes.json();
  assert(acceptRes.status === 200 && acceptData.request?.status === 'ACCEPTED', 'Captain accepted join request');

  console.log('\n--- Step 4: Player Receives Notification & Opens Confirmed Match ---');
  const notifRes = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  }).then((r) => r.json());
  const foundNotif = notifRes.notifications?.find(
    (n) => n.matchId === matchId && n.type === 'JOIN_REQUEST_ACCEPTED'
  );
  assert(!!foundNotif, 'Player received confirmation notification');

  // Player checks confirmed spot
  const myReqs = await fetch(`${API_URL}/join-requests/me`, {
    headers: { Authorization: `Bearer ${playerToken}` },
  }).then((r) => r.json());
  const confirmedSpot = myReqs.requests?.find((r) => r.matchId === matchId && r.status === 'ACCEPTED');
  assert(!!confirmedSpot, 'Spot Confirmed validated for player');

  console.log('\n--- Step 5: Realtime Socket.IO Chat Exchange ---');
  // Lazy group room creation
  const groupRoomRes = await fetch(`${API_URL}/chat/matches/${matchId}/room`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerToken}` },
  }).then((r) => r.json());
  const roomId = groupRoomRes.room?.id;
  assert(!!roomId, `Group chat room resolved (${roomId})`);

  // Socket.IO message exchange
  const socketP = new Promise((resolve) => {
    const socketPlayer = io(SOCKET_URL, {
      auth: { token: playerToken },
      transports: ['websocket'],
    });

    let received = false;

    socketPlayer.on('connect', () => {
      socketPlayer.emit('chat:join-room', { roomId }, async () => {
        setTimeout(async () => {
          await fetch(`${API_URL}/chat/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${captainToken}` },
            body: JSON.stringify({ body: 'Welcome to the squad for the demo!' }),
          });
        }, 500);
      });
    });

    socketPlayer.on('chat:message', (msg) => {
      if (msg.body && msg.body.includes('Welcome to the squad')) {
        received = true;
        socketPlayer.disconnect();
        resolve(true);
      }
    });

    setTimeout(() => {
      socketPlayer.disconnect();
      resolve(received);
    }, 6000);
  });

  const socketOk = await socketP;
  assert(socketOk, 'Realtime Socket.IO chat message exchanged live');

  console.log('\n--- Step 6: Player Queries NVIDIA AI Coach ---');
  const coachRes = await fetch(`${API_URL}/coach/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
    body: JSON.stringify({
      sport: 'cricket',
      message: 'Give me one quick batting timing tip for the demo.',
    }),
  });
  const coachData = await coachRes.json();
  assert(
    coachRes.status === 200 && coachData.message && coachData.message.length > 50 && coachData.provider === 'nvidia',
    `NVIDIA AI Coach returned live verified response (${coachData.message?.length} chars)`
  );

  console.log('\n====================================================');
  console.log(`CORE DEMO FLOW RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

verifyDemoCoreFlow().catch((err) => {
  console.error('Demo verification error:', err);
  process.exit(1);
});
