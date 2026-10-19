import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { io as connectSocket } from "socket.io-client";
import {
  isActiveCapability,
  resolveActiveMode,
} from "../../mobile/utils/capabilities";
import { resolveBackendUrl } from "../../mobile/utils/backendUrl";
import { normalizeMatchSchedule } from "../../mobile/utils/matchSchedule";
import { normalizeHubVerification } from "../../mobile/utils/hubVerification";
import { validateFutureSchedule } from "../src/utils/schedule.js";
import { RAGEngine } from "../src/rag/ragEngine.js";
process.env.NODE_ENV = "test";
process.env.APP_DATA_MODE = "test";
test('verification references normalize across both API contracts', () => {
  assert.equal(normalizeHubVerification({requestId:'request-1'} as any).id,'request-1');
  assert.equal(normalizeHubVerification({id:'request-2',requestId:'request-1'} as any).id,'request-2');
  assert.throws(()=>normalizeHubVerification({} as any),/missing its reference/);
});
const { SupabaseRepo } = require("../src/models/supabaseRepo.js");
const app = require("../src/app.js").default;
const { initSocketServer } = require("../src/socket/socketServer.js");

test("PLAYER primary role does not override a granted Captain capability and chosen mode", () => {
  assert.equal(
    isActiveCapability(
      ["PLAYER", "TEAM_CAPTAIN"],
      "TEAM_CAPTAIN",
      "TEAM_CAPTAIN",
    ),
    true,
  );
  assert.equal(
    isActiveCapability(["PLAYER", "TEAM_CAPTAIN"], "PLAYER", "TEAM_CAPTAIN"),
    false,
  );
  assert.equal(
    isActiveCapability(["PLAYER"], "TEAM_CAPTAIN", "TEAM_CAPTAIN"),
    false,
  );
  assert.equal(resolveActiveMode(["PLAYER"], "ADMIN"), "PLAYER");
  assert.equal(
    isActiveCapability(["PLAYER", "HUB_OWNER"], "HUB_OWNER", "HUB_OWNER"),
    true,
  );
});
test("REST and socket backend resolution honors separate hosted API and explicit same-origin", () => {
  const hosted = {
    hostname: "app.example.com",
    port: "443",
    origin: "https://app.example.com",
  };
  assert.equal(
    resolveBackendUrl("https://api.example.com/", hosted, "192.168.1.1"),
    "https://api.example.com",
  );
  assert.equal(resolveBackendUrl("same-origin", hosted), hosted.origin);
  assert.throws(() => resolveBackendUrl("", hosted), /EXPO_PUBLIC_API_URL/);
  assert.equal(
    resolveBackendUrl("", {
      hostname: "192.168.1.2",
      port: "8081",
      origin: "http://192.168.1.2:8081",
    }),
    "http://192.168.1.2:5000",
  );
});
test("new match schedule rejects invalid calendar dates, times and past fixtures", () => {
  assert.match(validateFutureSchedule("2099-02-30", "18:00")!, /calendar/);
  assert.match(validateFutureSchedule("2099-02-20", "25:00")!, /24-hour/);
  assert.match(validateFutureSchedule("2020-02-20", "18:00")!, /future/);
  assert.match(validateFutureSchedule("tomorrow", "8 PM")!, /YYYY/);
  assert.equal(validateFutureSchedule("2099-02-20", "18:00"), null);
  assert.deepEqual(
    normalizeMatchSchedule(
      "Tomorrow",
      "8:30 PM - 10:00 PM",
      Date.parse("2026-10-18T22:00Z"),
    ),
    { date: "2026-10-20", startTime: "20:30" },
  );
});
test("production cannot downgrade to synthetic auth; web origins are explicit and native remains supported", () => {
  const previous = {
    node: process.env.NODE_ENV,
    mode: process.env.APP_DATA_MODE,
    origins: process.env.ALLOWED_ORIGINS,
  };
  try {
    process.env.NODE_ENV = "production";
    process.env.APP_DATA_MODE = "test";
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    const runtime = require("../src/config/runtime.js");
    const { isOriginAllowed } = require("../src/config/cors.js");
    assert.equal(runtime.getAppDataMode(), "production");
    assert.equal(runtime.allowsSyntheticAuth(), false);
    assert.equal(runtime.allowsMemoryStores(), false);
    assert.equal(isOriginAllowed("https://app.example.com"), true);
    assert.equal(isOriginAllowed("https://evil.example.com"), false);
    assert.equal(isOriginAllowed(undefined), true);
  } finally {
    process.env.NODE_ENV = previous.node;
    process.env.APP_DATA_MODE = previous.mode;
    previous.origins === undefined
      ? delete process.env.ALLOWED_ORIGINS
      : (process.env.ALLOWED_ORIGINS = previous.origins);
  }
});
test("RAG current-product retrieval benchmark", () => {
  const rag = new RAGEngine();
  const cases = [
    ["five primary tabs Discover Venues", "faq.md"],
    ["player-first signup Captain activeMode", "roles.md"],
    [
      "venue reservations cancellation deadline advance refund",
      "hub-verification.md",
    ],
    ["joining match pending acceptance confirmation", "join-requests.md"],
    ["weather unavailable Open-Meteo", "weather.md"],
    ["VICE_CAPTAIN roster label", "captain-rules.md"],
  ];
  assert.equal(rag.getLoadedSources().length, 9);
  for (const [query, source] of cases)
    assert.ok(
      rag.retrieve(query, { topK: 3 }).some((r) => r.source === source),
      query,
    );
});

test("isolated Player upgrade → fixture → join → accept → two Socket.IO clients and lost acknowledgement REST retry", async (t) => {
  const server = http.createServer(app);
  const io = initSocketServer(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const captain = "00000000-0000-0000-0000-000000009501",
    player = "00000000-0000-0000-0000-000000009502",
    other = "00000000-0000-0000-0000-000000009503",
    outsider = "00000000-0000-0000-0000-000000009504";
  const token = (id: string) => `test_token:${id}:f0%40example.com`;
  async function api(id: string, path: string, method = "GET", body?: unknown) {
    const r = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token(id)}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: (await r.json()) as any };
  }
  const sockets: ReturnType<typeof connectSocket>[] = [];
  try {
    for (const id of [captain, player, other, outsider]) {
      assert.equal(
        (await api(id, "/api/profile/init", "POST", { name: "F0 Athlete" }))
          .status,
        200,
      );
      assert.equal(
        (
          await api(id, "/api/profile/player", "PUT", {
            preferredSports: ["cricket"],
            skillLevel: "beginner",
            primaryLocation: "Gulberg Lahore",
            cityId: "lahore",
            phone: "03001234567",
          })
        ).status,
        200,
      );
    }
    assert.equal((await api(captain, "/api/captain/team")).status, 403);
    const setup = {
      teamName: "F0 Acceptance Team",
      sports: ["cricket"],
      skillLevel: "beginner",
      primaryLocation: "Gulberg Lahore",
    };
    await t.test(
      "simultaneous Captain setup creates one primary team",
      async () => {
        const results = await Promise.all([
          api(captain, "/api/profile/captain", "PUT", setup),
          api(captain, "/api/profile/captain", "PUT", setup),
        ]);
        assert.ok(results.every((r) => r.status === 200));
        const profile = await api(captain, "/api/profile/me");
        assert.equal(profile.body.user.role, "PLAYER");
        assert.ok(profile.body.roles.includes("TEAM_CAPTAIN"));
        assert.equal((await api(captain, "/api/captain/team")).status, 200);
      },
    );
    const created = await api(captain, "/api/matches", "POST", {
      title: "F0 Acceptance Cricket",
      sport: "cricket",
      date: "2099-10-20",
      startTime: "20:00",
      venueName: "F0 Test Venue",
      area: "Gulberg",
      skillLevel: "beginner",
      totalCapacity: 2,
      openSlots: 2,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const matchId = created.body.id || created.body.match?.id;
    const request = await api(
      player,
      `/api/matches/${matchId}/join`,
      "POST",
      {},
    );
    assert.equal(request.status, 201);
    const requestId = request.body.id;
    await t.test(
      "REST acceptance creates notification and confirmed group access",
      async () => {
        const result = await api(
          captain,
          `/api/join-requests/${requestId}`,
          "PATCH",
          { action: "ACCEPT" },
        );
        assert.equal(result.status, 200, JSON.stringify(result.body));
        const notifications = await SupabaseRepo.getUserNotifications(player);
        assert.equal(
          notifications.filter(
            (n: any) =>
              n.type === "JOIN_REQUEST_ACCEPTED" &&
              n.joinRequestId === requestId,
          ).length,
          1,
        );
      },
    );
    await t.test(
      "HITL acceptance uses the same notification contract and confirmation retry stays idempotent",
      async () => {
        const pending = await api(
          other,
          `/api/matches/${matchId}/join`,
          "POST",
          {},
        );
        assert.equal(pending.status, 201);
        const {
          prepareAcceptJoinRequestAction,
          executeCaptainAction,
        } = require("../src/agents/actions/captainActionTools.js");
        const draft = await prepareAcceptJoinRequestAction(captain, {
          requestId: pending.body.id,
        });
        assert.equal(draft.success, true);
        const result = await executeCaptainAction(
          draft.action.actionId,
          captain,
        );
        assert.equal(result.success, true);
        await executeCaptainAction(draft.action.actionId, captain);
        const notifications = await SupabaseRepo.getUserNotifications(other);
        assert.equal(
          notifications.filter(
            (n: any) =>
              n.type === "JOIN_REQUEST_ACCEPTED" &&
              n.joinRequestId === pending.body.id,
          ).length,
          1,
        );
      },
    );
    const roomRes = await api(
      player,
      `/api/chat/matches/${matchId}/room`,
      "POST",
      {},
    );
    assert.ok([200, 201].includes(roomRes.status));
    const roomId = roomRes.body.room.id;
    for (const id of [captain, player]) {
      const socket = connectSocket(base, {
        auth: { token: token(id) },
        transports: ["websocket"],
        reconnection: false,
      });
      sockets.push(socket);
      await new Promise<void>((r, j) => {
        socket.once("connect", r);
        socket.once("connect_error", j);
      });
      const joined = await socket
        .timeout(4000)
        .emitWithAck("room:join", { roomId });
      assert.equal(joined.success, true);
    }
    await t.test(
      "two clients exchange messages; REST retry after omitted ack has one stored row",
      async () => {
        const received = new Promise<any>((r) =>
          sockets[1].once("chat:message", r),
        );
        sockets[0].emit("chat:send", {
          roomId,
          body: "F0 hello",
          clientMessageId: "lost_ack_1",
        }); // Deliberately omit ack callback.
        const first = await received;
        const retry = await api(
          captain,
          `/api/chat/rooms/${roomId}/messages`,
          "POST",
          { body: "F0 hello", clientMessageId: "lost_ack_1" },
        );
        assert.equal(retry.body.message.id, first.id);
        const reply = new Promise<any>((r) =>
          sockets[0].once("chat:message", r),
        );
        await sockets[1]
          .timeout(4000)
          .emitWithAck("chat:send", {
            roomId,
            body: "F0 reply",
            clientMessageId: "reply_1",
          });
        assert.equal((await reply).body, "F0 reply");
        const history = await api(player, `/api/chat/rooms/${roomId}/messages`);
        assert.equal(history.body.messages.length, 2);
        assert.equal(
          (await api(outsider, `/api/chat/rooms/${roomId}/messages`)).status,
          403,
        );
      },
    );
  } finally {
    sockets.forEach((s) => s.disconnect());
    await new Promise<void>((r) => io.close(() => r()));
  }
});
