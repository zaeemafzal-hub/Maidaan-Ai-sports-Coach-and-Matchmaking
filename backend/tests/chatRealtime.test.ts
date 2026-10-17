process.env.NODE_ENV = 'test';
process.env.APP_DATA_MODE = 'test';
process.env.SKIP_SERVER_LISTEN = 'true';

import assert from 'assert';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import app from '../src/app.js';
import { initSocketServer } from '../src/socket/socketServer.js';
import { SupabaseRepo } from '../src/models/supabaseRepo.js';

let server: http.Server;
let serverUrl: string;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
  } catch (error: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function connectClient(token?: string, extraOptions = {}): Promise<ClientSocketType> {
  return new Promise((resolve, reject) => {
    const socket = ClientSocket(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: 3000,
      ...extraOptions,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
}

async function runChatRealtimeTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN PHASE E REALTIME CHAT TEST SUITE');
  console.log('======================================================\n');

  // Start HTTP and Socket.IO server on random available port
  server = http.createServer(app);
  initSocketServer(server);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as any;
  const port = address.port;
  serverUrl = `http://127.0.0.1:${port}`;

  // Seed fixture users and profiles
  const captainUser = await SupabaseRepo.createProfile({
    id: `capt_${Date.now()}`,
    name: 'Captain Babar',
    email: 'babar@maidaan.pk',
    role: 'TEAM_CAPTAIN',
  });

  const confirmedPlayer = await SupabaseRepo.createProfile({
    id: `play1_${Date.now()}`,
    name: 'Shaheen Afridi',
    email: 'shaheen@maidaan.pk',
    role: 'PLAYER',
  });

  const pendingPlayer = await SupabaseRepo.createProfile({
    id: `play2_${Date.now()}`,
    name: 'Naseem Shah',
    email: 'naseem@maidaan.pk',
    role: 'PLAYER',
  });

  const outsiderPlayer = await SupabaseRepo.createProfile({
    id: `play3_${Date.now()}`,
    name: 'Rizwan Keeper',
    email: 'rizwan@maidaan.pk',
    role: 'PLAYER',
  });

  const captainToken = `test_token:${captainUser.id}:${encodeURIComponent(captainUser.email)}`;
  const confirmedPlayerToken = `test_token:${confirmedPlayer.id}:${encodeURIComponent(confirmedPlayer.email)}`;
  const pendingPlayerToken = `test_token:${pendingPlayer.id}:${encodeURIComponent(pendingPlayer.email)}`;
  const outsiderToken = `test_token:${outsiderPlayer.id}:${encodeURIComponent(outsiderPlayer.email)}`;

  // Seed match fixture
  const match = await SupabaseRepo.createMatch({
    sport: 'cricket',
    format: 'T20',
    title: 'Lahore Derby Clash',
    venueName: 'Model Town Ground',
    area: 'Model Town',
    date: '2026-11-01',
    startTime: '18:00',
    skillLevel: 'intermediate',
    contributionPerPlayer: 500,
    totalCapacity: 10,
    openSlots: 4,
    captainId: captainUser.id,
  });

  // Confirmed join request for confirmedPlayer
  const acceptedRequest = await SupabaseRepo.createJoinRequest({
    matchId: match.id,
    playerId: confirmedPlayer.id,
  });
  await SupabaseRepo.acceptJoinRequest(acceptedRequest.id, captainUser.id);

  // Pending join request for pendingPlayer
  await SupabaseRepo.createJoinRequest({
    matchId: match.id,
    playerId: pendingPlayer.id,
  });

  // Create match squad room
  const { room: groupRoom } = await SupabaseRepo.findOrCreateGroupRoom(match.id);

  // Create direct room between captain and confirmed player
  const directRoom = await SupabaseRepo.findOrCreateDirectRoom(
    captainUser.id,
    confirmedPlayer.id
  );

  // -------------------------------------------------------------------------
  // 1. Connection Authentication Tests
  // -------------------------------------------------------------------------
  await test('1. Rejects socket connection without auth token', async () => {
    let rejected = false;
    try {
      await connectClient();
    } catch (err: any) {
      rejected = true;
      assert.strictEqual(err.message, 'AUTH_REQUIRED');
    }
    assert.strictEqual(rejected, true, 'Connection without token must fail');
  });

  await test('2. Rejects socket connection with invalid/expired token', async () => {
    let rejected = false;
    try {
      await connectClient('invalid_token_xyz');
    } catch (err: any) {
      rejected = true;
      assert.strictEqual(err.message, 'AUTH_REQUIRED');
    }
    assert.strictEqual(rejected, true, 'Connection with invalid token must fail');
  });

  await test('3. Accepts socket connection with valid JWT/test token', async () => {
    const socket = await connectClient(captainToken);
    assert.strictEqual(socket.connected, true);
    socket.disconnect();
  });

  // -------------------------------------------------------------------------
  // 2. Room Authorization Tests
  // -------------------------------------------------------------------------
  await test('4. Allows joining authorized group room for captain', async () => {
    const socket = await connectClient(captainToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: groupRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, true);
    assert.strictEqual(joinRes.roomId, groupRoom.id);
    socket.disconnect();
  });

  await test('5. Allows joining authorized group room for confirmed player', async () => {
    const socket = await connectClient(confirmedPlayerToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: groupRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, true);
    socket.disconnect();
  });

  await test('6. Rejects joining group room for non-confirmed player (pending join request)', async () => {
    const socket = await connectClient(pendingPlayerToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: groupRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, false);
    assert.strictEqual(joinRes.code, 'NOT_ROOM_MEMBER');
    socket.disconnect();
  });

  await test('7. Rejects joining room user is not a member of (outsider)', async () => {
    const socket = await connectClient(outsiderToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: groupRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, false);
    assert.strictEqual(joinRes.code, 'NOT_ROOM_MEMBER');
    socket.disconnect();
  });

  await test('8. Allows joining direct room user belongs to', async () => {
    const socket = await connectClient(confirmedPlayerToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: directRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, true);
    socket.disconnect();
  });

  await test('9. Rejects joining direct room user does not belong to', async () => {
    const socket = await connectClient(outsiderToken);
    const joinRes = await new Promise<any>((resolve) => {
      socket.emit('room:join', { roomId: directRoom.id }, resolve);
    });
    assert.strictEqual(joinRes.success, false);
    assert.strictEqual(joinRes.code, 'NOT_ROOM_MEMBER');
    socket.disconnect();
  });

  // -------------------------------------------------------------------------
  // 3. Realtime Messaging & Persistence Invariants
  // -------------------------------------------------------------------------
  await test('10. Client sends message -> server persists to DB BEFORE acknowledging & broadcasting', async () => {
    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const testText = 'Squad, meet at pitch 2 at 17:30 sharp.';
    const clientMsgId = `client_msg_${Date.now()}`;

    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: testText, clientMessageId: clientMsgId },
        resolve
      );
    });

    assert.strictEqual(ack.success, true);
    assert.strictEqual(ack.clientMessageId, clientMsgId);
    assert.ok(ack.message);
    assert.strictEqual(ack.message.body, testText);
    assert.strictEqual(ack.message.senderId, captainUser.id);

    // Verify record actually exists in DB
    const dbMessages = await SupabaseRepo.getRoomMessages(groupRoom.id);
    const persisted = dbMessages.find((m) => m.id === ack.message.id);
    assert.ok(persisted, 'Message must be persisted in database before ack');
    assert.strictEqual(persisted?.body, testText);

    sender.disconnect();
  });

  await test('11. Other room members receive chat:message event in realtime', async () => {
    const receiver = await connectClient(confirmedPlayerToken);
    await new Promise<any>((res) => receiver.emit('room:join', { roomId: groupRoom.id }, res));

    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const receivePromise = new Promise<any>((resolve) => {
      receiver.on('chat:message', (msg) => {
        resolve(msg);
      });
    });

    const bodyText = 'Make sure to bring white kit.';
    await new Promise<any>((resolve) => {
      sender.emit('chat:send', { roomId: groupRoom.id, body: bodyText }, resolve);
    });

    const received = await receivePromise;
    assert.strictEqual(received.body, bodyText);
    assert.strictEqual(received.senderId, captainUser.id);
    assert.strictEqual(received.roomId, groupRoom.id);

    receiver.disconnect();
    sender.disconnect();
  });

  await test('12. Sender receives ack with matching clientMessageId and persisted message', async () => {
    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const myClientMessageId = `cid_${Date.now()}`;
    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: 'Checking ack identity', clientMessageId: myClientMessageId },
        resolve
      );
    });

    assert.strictEqual(ack.success, true);
    assert.strictEqual(ack.clientMessageId, myClientMessageId);
    assert.ok(ack.message?.id);

    sender.disconnect();
  });

  await test('13. Message sent with spoofed senderId in payload uses server-derived userId', async () => {
    const sender = await connectClient(confirmedPlayerToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    // Player attempts to spoof senderId as captain
    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        {
          roomId: groupRoom.id,
          body: 'Impersonation attempt',
          senderId: captainUser.id, // Malicious spoof
        },
        resolve
      );
    });

    assert.strictEqual(ack.success, true);
    assert.strictEqual(
      ack.message.senderId,
      confirmedPlayer.id,
      'Server must use verified socket.data.userId, never client senderId'
    );

    sender.disconnect();
  });

  await test('14. Message to unauthorized room is rejected with NOT_ROOM_MEMBER error', async () => {
    const sender = await connectClient(outsiderToken);

    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: 'Intrusion message' },
        resolve
      );
    });

    assert.strictEqual(ack.success, false);
    assert.strictEqual(ack.code, 'NOT_ROOM_MEMBER');

    sender.disconnect();
  });

  // -------------------------------------------------------------------------
  // 4. Input Validation & Edge Cases
  // -------------------------------------------------------------------------
  await test('15. Message exceeding 500 characters is rejected', async () => {
    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const giantText = 'a'.repeat(501);
    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: giantText },
        resolve
      );
    });

    assert.strictEqual(ack.success, false);
    assert.strictEqual(ack.code, 'MESSAGE_TOO_LONG');

    sender.disconnect();
  });

  await test('16. Empty/whitespace message is rejected', async () => {
    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: '    ' },
        resolve
      );
    });

    assert.strictEqual(ack.success, false);
    assert.strictEqual(ack.code, 'INVALID_BODY');

    sender.disconnect();
  });

  await test('17. Non-string body is rejected', async () => {
    const sender = await connectClient(captainToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));

    const ack = await new Promise<any>((resolve) => {
      sender.emit(
        'chat:send',
        { roomId: groupRoom.id, body: 12345 as any },
        resolve
      );
    });

    assert.strictEqual(ack.success, false);
    assert.strictEqual(ack.code, 'INVALID_BODY');

    sender.disconnect();
  });

  // -------------------------------------------------------------------------
  // 5. Rate Limiting & Room Lifecycle
  // -------------------------------------------------------------------------
  await test('18. Rate limiter triggers after exceeding threshold (40 msgs/min)', async () => {
    const spammer = await connectClient(confirmedPlayerToken);
    await new Promise<any>((res) => spammer.emit('room:join', { roomId: groupRoom.id }, res));

    let hitRateLimit = false;
    for (let i = 0; i < 45; i++) {
      const ack = await new Promise<any>((resolve) => {
        spammer.emit(
          'chat:send',
          { roomId: groupRoom.id, body: `Message batch test ${i}` },
          resolve
        );
      });
      if (ack.code === 'RATE_LIMITED') {
        hitRateLimit = true;
        break;
      }
    }

    assert.strictEqual(hitRateLimit, true, 'Rate limit must trigger after threshold');
    spammer.disconnect();
  });

  await test('19. Rate limited error event sent to client socket', async () => {
    const spammer = await connectClient(confirmedPlayerToken);
    await new Promise<any>((res) => spammer.emit('room:join', { roomId: groupRoom.id }, res));

    let receivedRateLimitEvent = false;
    spammer.on('chat:error', (err) => {
      if (err.code === 'RATE_LIMITED') {
        receivedRateLimitEvent = true;
      }
    });

    await new Promise<any>((resolve) => {
      spammer.emit('chat:send', { roomId: groupRoom.id, body: 'Spam trigger' }, resolve);
    });

    assert.strictEqual(receivedRateLimitEvent, true);
    spammer.disconnect();
  });

  await test('20. Leaving a room stops receiving messages from that room', async () => {
    const receiver = await connectClient(captainToken);
    await new Promise<any>((res) => receiver.emit('room:join', { roomId: groupRoom.id }, res));

    // Leave the room
    await new Promise<any>((res) => receiver.emit('room:leave', { roomId: groupRoom.id }, res));

    let receivedUnexpectedMessage = false;
    receiver.on('chat:message', () => {
      receivedUnexpectedMessage = true;
    });

    // Another player sends a message
    const sender = await connectClient(confirmedPlayerToken);
    await new Promise<any>((res) => sender.emit('room:join', { roomId: groupRoom.id }, res));
    await new Promise<any>((res) =>
      sender.emit('chat:send', { roomId: groupRoom.id, body: 'Can you hear me?' }, res)
    );

    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(
      receivedUnexpectedMessage,
      false,
      'Socket must not receive messages after leaving room'
    );

    receiver.disconnect();
    sender.disconnect();
  });

  await test('21. Client disconnects cleanly without server errors and reconnects successfully', async () => {
    const socket = await connectClient(captainToken);
    assert.strictEqual(socket.connected, true);

    socket.disconnect();
    assert.strictEqual(socket.connected, false);

    // Reconnect
    const reconnected = await connectClient(captainToken);
    assert.strictEqual(reconnected.connected, true);

    const joinRes = await new Promise<any>((res) =>
      reconnected.emit('room:join', { roomId: groupRoom.id }, res)
    );
    assert.strictEqual(joinRes.success, true);

    reconnected.disconnect();
  });

  // Cleanup server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n======================================================');
  console.log('🎉 ALL 21 REALTIME CHAT EVENT TESTS COMPLETED');
  console.log('======================================================\n');
}

runChatRealtimeTests().catch((err) => {
  console.error('Fatal error running chat realtime tests:', err);
  process.exit(1);
});
