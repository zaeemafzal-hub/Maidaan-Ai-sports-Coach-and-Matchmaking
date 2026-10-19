import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import app from "../src/app.js";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
async function main() {
  if (process.env.NODE_ENV === "test")
    throw new Error("Live verification requires live mode.");
  const email = `location-check-${crypto.randomUUID()}@example.com`,
    password = crypto.randomBytes(24).toString("base64url") + "Aa1!";
  let id = "",
    photoPath = "";
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new Error("Could not create disposable verification user.");
    id = created.data.user.id;
    await SupabaseRepo.createProfile({
      id,
      email,
      name: "Location Verification",
      role: "PLAYER",
    });
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session)
      throw new Error("Disposable verification sign-in failed.");
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    async function request(path: string, method = "GET", body?: unknown) {
      const r = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${login.data.session!.access_token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, body: (await r.json()) as any };
    }
    const photo = await request("/api/profile/player/photo", "POST", {
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
    });
    assert.equal(photo.status, 201, JSON.stringify(photo.body));
    photoPath = new URL(photo.body.url).pathname.split("/profile-photos/")[1];
    assert.equal((await fetch(photo.body.url)).status, 200);
    const result = await request("/api/profile/player", "PUT", {
      preferredSports: ["cricket"],
      skillLevel: "intermediate",
      primaryLocation: "Gulberg, Lahore",
      cityId: "lahore",
      areaId: "gulberg",
      phone: "03001234567",
      avatarUrl: photo.body.url,
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const profile = (await request("/api/profile/me")).body;
    assert.equal(profile.playerProfile.phone, "+923001234567");
    assert.equal(profile.playerProfile.areaId, "gulberg");
    assert.equal(profile.playerProfile.avatarUrl, photo.body.url);
    assert.equal(profile.onboarding.player, true);
    const hubName = `Location Verification ${id.slice(0, 8)}`;
    const hub = await request("/api/profile/hub", "PUT", {
      hubName,
      location: "Gulberg, Lahore",
      cityId: "lahore",
      areaId: "gulberg",
      courtsCount: 1,
      contactNumber: "+923001234567",
      sports: ["cricket"],
    });
    assert.equal(hub.status, 200, JSON.stringify(hub.body));
    const venue = await request("/api/hub/venue", "PUT", {
      name: hubName,
      location: "Gulberg, Lahore",
      cityId: "lahore",
      areaId: "gulberg",
      contactNumber: "+923001234567",
      sports: ["cricket"],
      latitude: 31.52,
      longitude: 74.35,
      description: "Disposable location verification",
      photoUrls: [],
    });
    assert.equal(venue.status, 200, JSON.stringify(venue.body));
    const results = await request(
      "/api/hubs?city=lahore&area=gulberg&search=" +
        encodeURIComponent(hubName),
    );
    assert.equal(results.status, 200);
    assert.equal(results.body.hubs.length, 1);
    assert.equal(results.body.hubs[0].areaId, "gulberg");
    assert.equal(results.body.hubs[0].latitude, 31.52);
    console.log(
      "PASS live Supabase: profile photo upload/retrieval, phone normalization, city/area and photo persistence, onboarding completeness, hub setup, exact venue pin persistence, and city/area venue search.",
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (photoPath) {
      const result = await supabaseAdmin.storage
        .from("profile-photos")
        .remove([photoPath]);
      if (result.error) throw new Error("Could not remove verification photo.");
    }
    if (id) {
      const result = await supabaseAdmin.auth.admin.deleteUser(id);
      if (result.error)
        throw new Error("Could not remove disposable verification user.");
    }
    console.log("Disposable location verification user and photo removed.");
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
