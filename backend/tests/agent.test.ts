import assert from 'assert';
import crypto from 'crypto';
import { invokeMaidaanAgent } from '../src/agents/graph.js';
import { deterministicFallbackClassifier } from '../src/agents/nodes/classifyIntent.js';
import { sharedRAGEngine } from '../src/rag/index.js';
import { SupabaseRepo } from '../src/models/supabaseRepo.js';
import { actionStore } from '../src/agents/actions/actionStore.js';
import { executeCaptainAction } from '../src/agents/actions/captainActionTools.js';
import app from '../src/app.js';
import http from 'http';

// Set test environment
process.env.NODE_ENV = 'test';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MAIDAAN AGENT, RAG & CAPTAIN TEST SUITE');
  console.log('======================================================\n');

  // Seed sample fixtures and default profiles
  await SupabaseRepo.seedInitialMatchesIfEmpty();
  await SupabaseRepo.seedInitialHubsIfEmpty();

  // Create a verified player for testing RBAC boundaries
  const testPlayerId = '00000000-0000-0000-0000-000000000020';
  await SupabaseRepo.createProfile({
    id: testPlayerId,
    name: 'Babar Azam',
    email: 'babar@maidaan.pk',
    role: 'PLAYER',
  });

  const defaultCaptainId = '00000000-0000-0000-0000-000000000002';
  const otherCaptainId = '00000000-0000-0000-0000-000000000099';
  await SupabaseRepo.createProfile({
    id: otherCaptainId,
    name: 'Haris Rauf',
    email: 'haris@maidaan.pk',
    role: 'TEAM_CAPTAIN',
  });

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

  // ─── PHASE 1 REGRESSION TESTS (PRESERVED) ───────────────────────────────

  await test('1. Intent Routing: "Find me a football match" -> MATCHMAKING', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_1',
      message: 'Find me a football match',
    });
    assert.strictEqual(result.intent, 'MATCHMAKING');
    assert.strictEqual(result.sport, 'football');
    assert.ok(result.response.length > 0);
  });

  await test('2. Intent Routing: "How can I improve my badminton footwork?" -> COACHING', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_2',
      message: 'How can I improve my badminton footwork?',
    });
    assert.strictEqual(result.intent, 'COACHING');
    assert.strictEqual(result.sport, 'badminton');
    assert.ok(result.response.toLowerCase().includes('badminton') || result.response.includes('footwork') || result.response.includes('drill'));
  });

  await test('3. Intent Routing: "Should I play cricket outdoors tomorrow?" -> WEATHER', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_3',
      message: 'Should I play cricket outdoors tomorrow?',
    });
    assert.strictEqual(result.intent, 'WEATHER');
    assert.strictEqual(result.sport, 'cricket');
    assert.ok(result.response.includes('Weather') || result.response.includes('Temperature') || result.response.includes('Advisory'));
  });

  await test('4. Intent Routing: Unknown platform question -> GENERAL', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_4',
      message: 'What is Maidaan and how does it work?',
    });
    assert.strictEqual(result.intent, 'GENERAL');
    assert.ok(result.response.toLowerCase().includes('maidaan'));
  });

  await test('5. Fallback Classifier: deterministic fallback routing works correctly', async () => {
    const r1 = deterministicFallbackClassifier('Show me open padel games in Gulberg');
    assert.strictEqual(r1.intent, 'MATCHMAKING');
    assert.strictEqual(r1.sport, 'padel');
    assert.strictEqual(r1.area, 'Gulberg');

    const r2 = deterministicFallbackClassifier('Teach me how to bowl faster in cricket');
    assert.strictEqual(r2.intent, 'COACHING');
    assert.strictEqual(r2.sport, 'cricket');

    const r3 = deterministicFallbackClassifier('Will it rain during my football game today?');
    assert.strictEqual(r3.intent, 'WEATHER');
    assert.strictEqual(r3.sport, 'football');

    const r4 = deterministicFallbackClassifier('Can you tell me a funny joke about birds?');
    assert.strictEqual(r4.intent, 'GENERAL');
  });

  await test('6. Matchmaking Anti-Hallucination: No matches found -> Truthful response without fabrication', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_6',
      message: 'Find me an advanced padel game in NonExistentDesertLand',
    });
    assert.strictEqual(result.intent, 'MATCHMAKING');
    assert.ok(result.response.toLowerCase().includes('no open matches'));
    assert.strictEqual((result.toolResult as any).totalFound, 0);
  });

  // ─── PHASE 2 RAG REGRESSION TESTS (PRESERVED) ───────────────────────────

  await test('7. RAG Direct: "What does verified hub mean?" -> hub-verification.md in top 3', async () => {
    const results = sharedRAGEngine.retrieve('What does verified hub mean?', { topK: 3 });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.source === 'hub-verification.md'));
  });

  await test('8. RAG Direct: "How does a join request work?" -> join-requests.md in top 3', async () => {
    const results = sharedRAGEngine.retrieve('How does a join request work?', { topK: 3 });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.source === 'join-requests.md'));
  });

  await test('9. RAG Direct: "What can a team captain do?" -> captain-rules.md in top 3', async () => {
    const results = sharedRAGEngine.retrieve('What can a team captain do?', { topK: 3 });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.source === 'captain-rules.md'));
  });

  await test('10. RAG Direct: "What does Indoor Preferred mean?" -> weather.md in top 3', async () => {
    const results = sharedRAGEngine.retrieve('What does Indoor Preferred mean?', { topK: 3 });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.source === 'weather.md'));
  });

  await test('11. RAG Direct: "What sports does Maidaan support?" -> faq.md or matchmaking.md in top 3', async () => {
    const results = sharedRAGEngine.retrieve('What sports does Maidaan support?', { topK: 3 });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.source === 'faq.md' || r.source === 'matchmaking.md'));
  });

  await test('12. Graph + RAG: "What does verified hub mean?" -> GENERAL intent with hub-verification.md source metadata', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_rag_1',
      message: 'What does verified hub mean?',
    });
    assert.strictEqual(result.intent, 'GENERAL');
    assert.ok(result.sources && result.sources.length > 0);
    const sourceFiles = result.sources.map((s) => s.source);
    assert.ok(sourceFiles.includes('hub-verification.md'));
    assert.ok(result.response.includes('Verified Hub') || result.response.includes('verified') || result.response.includes('registration'));
  });

  await test('13. Graph + RAG: "How do I join a match?" -> Grounded in join-requests.md', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_rag_2',
      message: 'How do I join a match?',
    });
    assert.ok(result.sources && result.sources.length > 0);
    const sourceFiles = result.sources.map((s) => s.source);
    assert.ok(sourceFiles.includes('join-requests.md') || sourceFiles.includes('matchmaking.md'));
  });

  await test('14. Graph + Live Tool: "Should I play football outside tomorrow?" -> WEATHER live tool authoritative + weather.md source', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_rag_3',
      message: 'Should I play football outside tomorrow?',
    });
    assert.strictEqual(result.intent, 'WEATHER');
    assert.ok(result.toolResult);
    assert.ok(
      (result.toolResult as any).tool === 'getWeatherForecastTool' ||
      (result.toolResult as any).tool === 'getWeather'
    );
    assert.ok(result.sources && result.sources.length > 0);
    assert.strictEqual(result.sources[0].source, 'weather.md');
  });

  await test('15. Graph + RAG Anti-Hallucination: Out-of-domain query -> No fabricated policy', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_user_rag_4',
      message: 'Can you give me a recipe to bake chocolate chip cookies?',
    });
    assert.strictEqual(result.intent, 'GENERAL');
    assert.ok(
      result.response.includes("couldn't find") ||
      result.response.includes('Welcome to Maidaan') ||
      result.response.includes('knowledge base')
    );
  });

  // ─── PHASE 3 HUB DISCOVERY TESTS (PRESERVED) ────────────────────────────

  await test('16. Hub Discovery Routing: "Find a badminton hub near Gulberg" -> HUB_DISCOVERY', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_hub_user_1',
      message: 'Find a badminton hub near Gulberg',
    });
    assert.strictEqual(result.intent, 'HUB_DISCOVERY');
    assert.strictEqual(result.sport, 'badminton');
    assert.strictEqual(result.area, 'Gulberg');
    assert.ok(result.toolResult);
    assert.strictEqual((result.toolResult as any).tool, 'searchHubsTool');
    assert.ok((result.toolResult as any).totalFound >= 1);
    assert.ok(result.response.includes('Gulberg Badminton Arena'));
  });

  await test('17. Hub Discovery Routing: "Which verified hubs support Padel?" -> HUB_DISCOVERY', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_hub_user_2',
      message: 'Which verified hubs support Padel?',
    });
    assert.strictEqual(result.intent, 'HUB_DISCOVERY');
    assert.strictEqual(result.sport, 'padel');
    assert.ok(result.toolResult);
    const hubs = (result.toolResult as any).hubs;
    assert.ok(hubs.every((h: any) => h.isVerified === true));
    assert.ok(hubs.some((h: any) => h.name.includes('Padel')));
  });

  await test('18. Hub Discovery Zero-Result Anti-Hallucination: No matching hubs -> Truthful response', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_hub_user_3',
      message: 'Find verified cricket hubs in NonExistentDesertLand',
    });
    assert.strictEqual(result.intent, 'HUB_DISCOVERY');
    assert.strictEqual((result.toolResult as any).totalFound, 0);
    assert.ok(result.response.includes('No sports hubs'));
  });

  await test('19. Hub Tool Truth: Result contains only real repository data', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_hub_user_4',
      message: 'Show me sports venues in Model Town',
    });
    assert.strictEqual(result.intent, 'HUB_DISCOVERY');
    const hubs = (result.toolResult as any).hubs;
    assert.ok(hubs.length >= 1);
    const firstHub = hubs[0];
    assert.ok(typeof firstHub.name === 'string');
    assert.ok(typeof firstHub.location === 'string');
    assert.ok(typeof firstHub.courtCount === 'number');
    assert.ok(typeof firstHub.isVerified === 'boolean');
    assert.ok(Array.isArray(firstHub.sports));
  });

  await test('20. Hub Verification Concept Explanation: Grounded in hub-verification.md', async () => {
    const result = await invokeMaidaanAgent({
      userId: 'test_hub_user_5',
      message: 'What is a verified hub and how does verification work?',
    });
    assert.ok(result.sources && result.sources.length > 0);
    assert.ok(result.sources.some((s) => s.source === 'hub-verification.md'));
    assert.ok(result.response.toLowerCase().includes('verified') || result.response.toLowerCase().includes('hub'));
  });

  // ─── PHASE 3 CAPTAIN READ-ONLY TESTS (PRESERVED) ────────────────────────

  await test('21. Captain Assistant: Authenticated TEAM_CAPTAIN "Show my matches" -> CAPTAIN, only owned fixtures', async () => {
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Show my matches',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.toolResult);
    assert.strictEqual((result.toolResult as any).tool, 'getCaptainMatchesTool');
    assert.ok((result.toolResult as any).total >= 1);
    assert.ok(result.response.includes('scheduled fixtures') || result.response.includes('Model Town'));
  });

  await test('22. Captain Assistant: "Which of my matches has open slots?" -> CAPTAIN with open slots', async () => {
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Which of my matches has open slots?',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.toolResult);
    const matches = (result.toolResult as any).matches;
    assert.ok(matches.every((m: any) => m.openSlots > 0));
    assert.ok((result.toolResult as any).openSlotsCount > 0);
  });

  await test('23. Captain Assistant: "Show pending join requests" -> CAPTAIN with pending applicants', async () => {
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Show pending join requests',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.toolResult);
    assert.strictEqual((result.toolResult as any).tool, 'getCaptainJoinRequestsTool');
    assert.ok((result.toolResult as any).pendingCount >= 1);
    assert.ok(result.response.includes('pending') || result.response.includes('request'));
  });

  await test('24. Captain Assistant Security: Authenticated PLAYER asking captain query -> Authorization denial', async () => {
    const result = await invokeMaidaanAgent({
      userId: testPlayerId,
      role: 'PLAYER',
      message: 'Show my pending join requests',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.strictEqual(result.toolResult, null, 'Tool execution must be blocked for non-captains');
    assert.ok(result.response.includes('Access restricted'), 'Expected access restricted denial message');
    assert.ok(result.response.includes('Team Captains'));
  });

  await test('25. Captain Assistant Privacy: No cross-captain data leakage', async () => {
    const result = await invokeMaidaanAgent({
      userId: otherCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Show my pending join requests',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.toolResult);
    assert.strictEqual((result.toolResult as any).pendingCount, 0, 'Must not leak other captain join requests');
    assert.ok(result.response.includes('no join requests'));
  });

  // ─── PHASE 4 TWO-PHASE TRANSACTIONAL ACTIONS (NEW) ──────────────────────

  let savedMatchActionId = '';

  await test('31. Captain Action: Incomplete create-match data -> missing-field prompt, NO DB mutation', async () => {
    const initialMatches = (await SupabaseRepo.getMatches()).length;
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Create a football match tomorrow',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.strictEqual(result.action, null);
    assert.ok(result.response.includes('still need') || result.response.includes('venue'));
    const afterMatches = (await SupabaseRepo.getMatches()).length;
    assert.strictEqual(afterMatches, initialMatches, 'Database must not mutate on incomplete prompt');
  });

  await test('32. Captain Action: Complete match details -> draft generated with AWAITING_CONFIRMATION, NO DB mutation', async () => {
    const initialMatches = (await SupabaseRepo.getMatches()).length;
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Create a football match called "Model Town 5v5 Turf" tomorrow at 20:00 at Model Town Ground in Model Town for 10 players intermediate fee 500',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.action, 'Expected action draft in result');
    assert.strictEqual(result.action.type, 'CREATE_MATCH');
    assert.strictEqual(result.action.status, 'AWAITING_CONFIRMATION');
    assert.ok(result.action.actionId.startsWith('capt_action_'));
    savedMatchActionId = result.action.actionId;
    assert.ok(result.response.includes('Confirmation Required') || result.response.includes('confirm'));
    const afterMatches = (await SupabaseRepo.getMatches()).length;
    assert.strictEqual(afterMatches, initialMatches, 'Match must not be created before explicit confirmation');
  });

  await test('33. Captain Action: Explicit confirmation -> exactly one match created', async () => {
    const initialMatches = (await SupabaseRepo.getMatches()).length;
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Confirm',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.action);
    assert.strictEqual(result.action.status, 'EXECUTED');
    assert.ok(result.response.includes('successfully created') || result.response.includes('Model Town 5v5 Turf'));
    const afterMatches = (await SupabaseRepo.getMatches()).length;
    assert.strictEqual(afterMatches, initialMatches + 1, 'Exactly one match must be created');
  });

  await test('34. Captain Action: Idempotency -> executing same action again creates NO duplicate', async () => {
    const initialMatches = (await SupabaseRepo.getMatches()).length;
    const execAgain = await executeCaptainAction(savedMatchActionId, defaultCaptainId);
    assert.strictEqual(execAgain.status, 'EXECUTED');
    assert.ok(execAgain.message.includes('already'));
    const afterMatches = (await SupabaseRepo.getMatches()).length;
    assert.strictEqual(afterMatches, initialMatches, 'Match count must remain unchanged');
  });

  await test('35. Captain Action: Expired action draft -> rejected safely', async () => {
    const expiredActionId = `capt_action_${crypto.randomUUID()}`;
    actionStore.saveAction({
      actionId: expiredActionId,
      type: 'CREATE_MATCH',
      userId: defaultCaptainId,
      createdAt: new Date(Date.now() - 2000000).toISOString(),
      expiresAt: new Date(Date.now() - 1000000).toISOString(),
      status: 'AWAITING_CONFIRMATION',
      summary: {},
      payload: {
        type: 'CREATE_MATCH',
        data: {
          sport: 'cricket',
          title: 'Expired Match',
          date: '2026-10-20',
          startTime: '18:00',
          venueName: 'Expired Ground',
          area: 'Gulberg',
          skillLevel: 'intermediate',
          totalCapacity: 10,
          openSlots: 10,
        },
      },
    });
    const execExpired = await executeCaptainAction(expiredActionId, defaultCaptainId);
    assert.strictEqual(execExpired.success, false);
    assert.strictEqual(execExpired.status, 'EXPIRED');
  });

  await test('36. Captain Action Security: PLAYER role attempting create-match agent action -> denied', async () => {
    const result = await invokeMaidaanAgent({
      userId: testPlayerId,
      role: 'PLAYER',
      message: 'Create a football match called "Illegal Player Match" tomorrow at 20:00 at Model Town Ground in Model Town for 10 players intermediate',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.strictEqual(result.action, null);
    assert.ok(result.response.includes('Access restricted'));
  });

  let savedAcceptReqId = '';

  await test('37. Captain Action: Accept request -> confirmation required, request remains PENDING', async () => {
    const captainMatches = await SupabaseRepo.getCaptainMatches(defaultCaptainId);
    const reqs = await SupabaseRepo.getMatchJoinRequests(captainMatches[0].id);
    const pendingReq = reqs.find((r) => r.status === 'PENDING');
    assert.ok(pendingReq, 'Seed pending join request must exist');
    savedAcceptReqId = pendingReq.id;

    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: `Accept join request for ${pendingReq.playerName}`,
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.action);
    assert.strictEqual(result.action.type, 'ACCEPT_JOIN_REQUEST');
    assert.strictEqual(result.action.status, 'AWAITING_CONFIRMATION');

    // Verify DB state did NOT change yet
    const dbReq = await SupabaseRepo.getJoinRequestById(pendingReq.id);
    assert.strictEqual(dbReq?.status, 'PENDING', 'Request must remain PENDING before confirmation');
  });

  await test('38. Captain Action: Explicit confirmation of accept -> request becomes ACCEPTED in database', async () => {
    const result = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Confirm',
    });
    assert.strictEqual(result.intent, 'CAPTAIN');
    assert.ok(result.action);
    assert.strictEqual(result.action.status, 'EXECUTED');
    const dbReqAfter = await SupabaseRepo.getJoinRequestById(savedAcceptReqId);
    assert.strictEqual(dbReqAfter?.status, 'ACCEPTED');
  });

  await test('39. Captain Action: Reject request -> requires confirmation and mutates to REJECTED on confirm', async () => {
    const captainMatches = await SupabaseRepo.getCaptainMatches(defaultCaptainId);
    const newReq = await SupabaseRepo.createJoinRequest({
      matchId: captainMatches[0].id,
      playerId: '00000000-0000-0000-0000-000000000030',
      message: 'Please take me in squad',
    });
    assert.strictEqual(newReq.status, 'PENDING');

    const prep = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Reject join request for Player',
    });
    assert.strictEqual(prep.intent, 'CAPTAIN');
    assert.ok(prep.action);
    assert.strictEqual(prep.action.type, 'REJECT_JOIN_REQUEST');

    // Confirm rejection
    const confirm = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Confirm',
    });
    assert.strictEqual(confirm.action?.status, 'EXECUTED');
    const dbReqRej = await SupabaseRepo.getJoinRequestById(newReq.id);
    assert.strictEqual(dbReqRej?.status, 'REJECTED');
  });

  await test('40. Captain Action Security: Cross-captain action execution denied', async () => {
    // otherCaptainId attempts to execute defaultCaptainId's action
    const stolenActionId = `capt_action_${crypto.randomUUID()}`;
    actionStore.saveAction({
      actionId: stolenActionId,
      type: 'CREATE_MATCH',
      userId: defaultCaptainId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      status: 'AWAITING_CONFIRMATION',
      summary: {},
      payload: {
        type: 'CREATE_MATCH',
        data: {
          sport: 'cricket',
          title: 'Owner Fixture',
          date: '2026-10-25',
          startTime: '17:00',
          venueName: 'Owner Ground',
          area: 'Gulberg',
          skillLevel: 'intermediate',
          totalCapacity: 10,
          openSlots: 10,
        },
      },
    });

    const execStolen = await executeCaptainAction(stolenActionId, otherCaptainId);
    assert.strictEqual(execStolen.success, false);
    assert.ok(execStolen.error?.includes('Forbidden'));
  });

  await test('41. Captain Action Concurrency: Accept fails gracefully if match becomes full before confirmation', async () => {
    // Create match with 1 open slot
    const tightMatch = await SupabaseRepo.createMatch({
      captainId: defaultCaptainId,
      sport: 'badminton',
      title: 'Tight Singles Final Spot',
      date: '2026-10-28',
      startTime: '18:00',
      venueName: 'Garrison Badminton',
      area: 'Cantt, Lahore',
      skillLevel: 'advanced',
      totalCapacity: 2,
      openSlots: 1,
    });

    // Create join request
    const req = await SupabaseRepo.createJoinRequest({
      matchId: tightMatch.id,
      playerId: '00000000-0000-0000-0000-000000000040',
      message: 'I want this slot',
    });

    // Prepare accept action
    const prep = await invokeMaidaanAgent({
      userId: defaultCaptainId,
      role: 'TEAM_CAPTAIN',
      message: 'Accept join request for Player',
    });
    assert.ok(prep.action);

    // Concurrently exhaust open slots to 0 before confirm
    SupabaseRepo.setMatchOpenSlotsForTest(tightMatch.id, 0, 'FULL');

    // Attempting confirmation must fail safely without overfilling
    const confirmResult = await executeCaptainAction(prep.action.actionId, defaultCaptainId);
    assert.strictEqual(confirmResult.success, false);
    assert.ok(confirmResult.error?.includes('full'));
  });

  await test('42. Captain Action Concurrency: Already handled join request returns safe error', async () => {
    const duplicateAccept = await SupabaseRepo.acceptJoinRequest(savedAcceptReqId, defaultCaptainId);
    assert.strictEqual(duplicateAccept.success, false);
    assert.strictEqual(duplicateAccept.code, 'INVALID_STATUS');
  });

  // ─── ENDPOINT & HTTP TESTS ──────────────────────────────────────────────

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // TEST 26: Unauthenticated request -> 401 Unauthorized
    await test('26. Endpoint Security: POST /api/agent/chat without token -> 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Find me a game' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Authentication required'));
    });

    // TEST 27: Validation: Missing or invalid message -> 400 Bad Request
    await test('27. Input Validation: POST /api/agent/chat with empty message -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${defaultCaptainId}:captain@maidaan.pk`,
        },
        body: JSON.stringify({ message: '   ' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('blank') || data.error.includes('non-empty'));
    });

    // TEST 28: End-to-End HTTP: Hub Discovery
    await test('28. End-to-End HTTP: POST /api/agent/chat executes Hub Discovery with typed response', async () => {
      const res = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${testPlayerId}:player@maidaan.pk`,
        },
        body: JSON.stringify({ message: 'Find a badminton hub in Gulberg' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.intent, 'HUB_DISCOVERY');
      assert.strictEqual(data.toolUsed, 'searchHubsTool');
      assert.ok(data.toolResult && data.toolResult.hubs.length >= 1);
      assert.ok(data.message.includes('Gulberg Badminton Arena'));
    });

    // TEST 29: End-to-End HTTP: Captain Assistant for TEAM_CAPTAIN
    await test('29. End-to-End HTTP: POST /api/agent/chat executes Captain Assistant for TEAM_CAPTAIN', async () => {
      const res = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${defaultCaptainId}:captain@maidaan.pk`,
        },
        body: JSON.stringify({ message: 'Show my matches' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.intent, 'CAPTAIN');
      assert.strictEqual(data.toolUsed, 'getCaptainMatchesTool');
      assert.ok(data.toolResult && data.toolResult.matches.length >= 1);
    });

    // TEST 30: End-to-End HTTP: Captain Assistant Denial for PLAYER
    await test('30. End-to-End HTTP: POST /api/agent/chat denies Captain queries to PLAYER', async () => {
      const res = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${testPlayerId}:player@maidaan.pk`,
        },
        body: JSON.stringify({ message: 'Show my pending join requests' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.intent, 'CAPTAIN');
      assert.strictEqual(data.toolUsed, 'none');
      assert.strictEqual(data.toolResult, null);
      assert.ok(data.message.includes('Access restricted'));
    });

    // TEST 43: End-to-End HTTP: Dedicated Action Confirmation Endpoint
    await test('43. End-to-End HTTP: POST /api/agent/actions/:actionId/confirm executes pending action', async () => {
      // 1. Prepare match draft via chat
      const chatRes = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${defaultCaptainId}:captain@maidaan.pk`,
        },
        body: JSON.stringify({
          message: 'Create a cricket match called "Gulberg T10 Night Cup" tomorrow at 21:00 at Central Nets in Gulberg for 14 players advanced fee 300',
        }),
      });
      assert.strictEqual(chatRes.status, 200);
      const chatData = await chatRes.json();
      assert.ok(chatData.action, 'Expected action draft in chat response');
      const actionId = chatData.action.actionId;
      assert.strictEqual(chatData.action.status, 'AWAITING_CONFIRMATION');

      // 2. Call dedicated confirmation endpoint
      const confirmRes = await fetch(`${baseUrl}/api/agent/actions/${actionId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer test_token:${defaultCaptainId}:captain@maidaan.pk`,
        },
      });
      assert.strictEqual(confirmRes.status, 200);
      const confirmData = await confirmRes.json();
      assert.strictEqual(confirmData.success, true);
      assert.strictEqual(confirmData.status, 'EXECUTED');
      assert.ok(confirmData.message.includes('successfully created'));
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

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
