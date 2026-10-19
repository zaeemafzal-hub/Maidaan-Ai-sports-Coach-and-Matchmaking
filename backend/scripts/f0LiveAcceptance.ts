/** Explicit disposable acceptance records only. Never seeds or changes existing accounts. */
import fs from "node:fs";
import crypto from "node:crypto";
import http from "node:http";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
import app from "../src/app.js";
import { initSocketServer } from "../src/socket/socketServer.js";

async function main() {
  process.env.APP_DATA_MODE = "production";
  process.env.ALLOWED_ORIGINS = "http://localhost:8081,http://localhost:8084";
  process.env.PAYMENT_MODE = "disabled";
  const identities: Record<string, any> = {};
  const evidence: unknown[] = [];
  const server = http.createServer(app);
  const io = initSocketServer(server);
  let cleaned = false;
  async function cleanup() {
    if (cleaned) return;
    cleaned = true;
    for (const name of [
      "PLAYER_A",
      "CAPTAIN_A",
      "PLAYER_B",
      "HUB_OWNER_A",
      "ADMIN_A",
    ]) {
      const id = identities[name]?.id;
      if (!id) continue;
      const result = await supabaseAdmin.auth.admin.deleteUser(id);
      evidence.push({ cleanup: name, success: !result.error });
    }
    fs.writeFileSync(
      "../output/f0-live-evidence.json",
      JSON.stringify(evidence, null, 2),
    );
    await new Promise<void>((r) => io.close(() => r()));
    fs.rmSync("../output/.env.f0-sessions.json", { force: true });
  }
  process.on("SIGINT", () => {
    void cleanup().then(() => process.exit(0));
  });
  await new Promise<void>((r) => server.listen(5004, "127.0.0.1", r));
  const base = "http://127.0.0.1:5004";
  async function request(
    name: string,
    path: string,
    method = "GET",
    body?: unknown,
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${identities[name].session.access_token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await r.json()) as any;
    if (r.status >= 400)
      throw new Error(
        `${name} ${method} ${path}: ${r.status} ${JSON.stringify(data)}`,
      );
    evidence.push({ actor: name, path, method, status: r.status });
    return data;
  }
  try {
    for (const name of [
      "PLAYER_A",
      "CAPTAIN_A",
      "PLAYER_B",
      "HUB_OWNER_A",
      "ADMIN_A",
    ]) {
      const email = `f0-${crypto.randomUUID()}@example.com`,
        password = crypto.randomBytes(24).toString("base64url") + "Aa1!";
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error || !created.data.user)
        throw new Error("Disposable user creation failed.");
      identities[name] = { id: created.data.user.id };
      const auth = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const login = await auth.auth.signInWithPassword({ email, password });
      if (login.error || !login.data.session)
        throw new Error("Disposable real Supabase password login failed.");
      identities[name].session = login.data.session;
      await request(name, "/api/profile/init", "POST", {
        name: `F0 DISPOSABLE ${name}`,
      });
      await request(name, "/api/profile/player", "PUT", {
        preferredSports: ["cricket"],
        skillLevel: "beginner",
        primaryLocation: "F0 Test address, Gulberg, Lahore",
        cityId: "lahore",
        phone: "03001234567",
      });
    }
    await request("CAPTAIN_A", "/api/profile/captain", "PUT", {
      teamName: "F0 DISPOSABLE Squad",
      sports: ["cricket"],
      skillLevel: "beginner",
      primaryLocation: "Gulberg Lahore",
    });
    const captainProfile = await request("CAPTAIN_A", "/api/profile/me");
    assert.equal(captainProfile.user.role, "PLAYER");
    assert.ok(captainProfile.roles.includes("TEAM_CAPTAIN"));
    const match = await request("CAPTAIN_A", "/api/matches", "POST", {
      title: "F0 DISPOSABLE acceptance match",
      sport: "cricket",
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      startTime: "20:00",
      venueName: "F0 TEST ONLY venue",
      area: "Gulberg",
      skillLevel: "beginner",
      totalCapacity: 4,
      openSlots: 2,
    });
    const matchId = match.id || match.match?.id;
    identities.matchId = matchId;
    const join = await request(
      "PLAYER_B",
      `/api/matches/${matchId}/join`,
      "POST",
      {},
    );
    await request("CAPTAIN_A", `/api/join-requests/${join.id}`, "PATCH", {
      action: "ACCEPT",
    });
    const notices = await SupabaseRepo.getUserNotifications(
      identities.PLAYER_B.id,
    );
    assert.ok(
      notices.some(
        (n) =>
          n.joinRequestId === join.id && n.type === "JOIN_REQUEST_ACCEPTED",
      ),
    );
    const group = await request(
      "PLAYER_B",
      `/api/chat/matches/${matchId}/room`,
      "POST",
      {},
    );
    identities.roomId = group.room.id;
    const sent = await request(
      "CAPTAIN_A",
      `/api/chat/rooms/${group.room.id}/messages`,
      "POST",
      {
        body: "F0 persisted live database check",
        clientMessageId: "f0_live_retry",
      },
    );
    const retry = await request(
      "CAPTAIN_A",
      `/api/chat/rooms/${group.room.id}/messages`,
      "POST",
      {
        body: "F0 persisted live database check",
        clientMessageId: "f0_live_retry",
      },
    );
    assert.equal(sent.message.id, retry.message.id);
    await request("HUB_OWNER_A", "/api/profile/hub", "PUT", {
      hubName: "F0 DISPOSABLE TEST hub",
      location: "F0 test address Gulberg Lahore",
      courtsCount: 1,
      contactNumber: "03001234567",
      sports: ["cricket"],
      cityId: "lahore",
      areaId: "gulberg",
    });
    await request("HUB_OWNER_A", "/api/hub/venue", "PUT", {
      name: "F0 DISPOSABLE TEST hub",
      location: "F0 test address Gulberg Lahore",
      contactNumber: "03001234567",
      sports: ["cricket"],
      cityId: "lahore",
      areaId: "gulberg",
      latitude: 31.52,
      longitude: 74.35,
      description:
        "Disposable administrative acceptance only; not a real venue.",
      photoUrls: [],
    });
    const space = await request("HUB_OWNER_A", "/api/hub/spaces", "POST", {
      name: "F0 TEST Pitch",
      sport: "cricket",
      status: "AVAILABLE",
      areaName: "Test ground",
      playFormat: "Net practice",
      surface: "turf",
      isIndoor: true,
      playerCapacity: 4,
      photoUrls: [],
    });
    await request("HUB_OWNER_A", "/api/hub/slots", "POST", {
      courtId: space.space.id,
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      startTime: "18:00",
      endTime: "20:00",
      price: 1000,
      bookingEnabled: false,
      paymentPolicy: "FULL_OR_ADVANCE",
      advancePercent: 25,
      cancelBeforeHours: 24,
      cancellationRefund: "FULL",
    });
    const verification = await request(
      "HUB_OWNER_A",
      "/api/hub/verification-request",
      "POST",
      {},
    );
    await SupabaseRepo.addRole(identities.ADMIN_A.id, "ADMIN");
    const queue = await request("ADMIN_A", "/api/admin/hub-verifications");
    const reviewId =
      verification.request?.id ||
      verification.id ||
      (queue.requests || []).find(
        (x: any) => x.hubOwnerId === identities.HUB_OWNER_A.id,
      )?.id;
    await request(
      "ADMIN_A",
      `/api/admin/hub-verifications/${reviewId}`,
      "PATCH",
      {
        action: "APPROVE",
        adminNote:
          "F0 disposable administrative test only. No physical verification.",
      },
    );
    const verified = await request("HUB_OWNER_A", "/api/hub/verification");
    assert.ok(JSON.stringify(verified).includes("APPROVED"));
    const summary = await request("ADMIN_A", "/api/admin/dashboard");
    assert.ok(summary);
    fs.writeFileSync(
      "../output/.env.f0-sessions.json",
      JSON.stringify(identities),
    );
    fs.writeFileSync(
      "../output/f0-live-evidence.json",
      JSON.stringify(evidence, null, 2),
    );
    console.log(
      "F0 live API acceptance passed. Disposable Supabase identities ready on localhost:5004. Session data stays in ignored output/.env.f0-sessions.json. Stop with Ctrl+C to remove all test users.",
    );
    if (!process.argv.includes("--keep")) await cleanup();
  } catch (err) {
    console.error((err as Error).message);
    await cleanup();
    process.exitCode = 1;
  }
}
void main();
