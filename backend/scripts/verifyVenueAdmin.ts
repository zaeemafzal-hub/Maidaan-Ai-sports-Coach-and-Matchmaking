import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import app from "../src/app.js";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
const fixturePath = new URL(
  "../../output/.env.hub-verification",
  import.meta.url,
);
interface Fixture {
  users: { id: string; email: string; password: string; kind: string }[];
  photos: string[];
  hubId?: string;
}
async function cleanup(fixture: Fixture) {
  // Verification accounts are disposable; real booking history is never purged.
  const ids = fixture.users.map((user) => user.id);
  if (ids.length) {
    const { data: bookings, error } = await supabaseAdmin
      .from("venue_bookings")
      .select("id")
      .in("owner_id", ids);
    if (error) throw new Error(error.message);
    const bookingIds = (bookings || []).map((booking) => booking.id);
    if (bookingIds.length) {
      for (const table of [
        "booking_payment_events",
        "booking_audit_log",
        "venue_bookings",
      ]) {
        const result = await supabaseAdmin
          .from(table)
          .delete()
          .in(table === "venue_bookings" ? "id" : "booking_id", bookingIds);
        if (result.error) throw new Error(result.error.message);
      }
    }
  }
  if (fixture.photos.length) {
    const { error } = await supabaseAdmin.storage
      .from("hub-photos")
      .remove(fixture.photos);
    if (error) throw new Error(error.message);
  }
  for (const user of fixture.users) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(error.message);
  }
  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
  console.log(
    "Temporary verification accounts, venue data and photos removed.",
  );
}
async function main() {
  if (process.argv.includes("--cleanup")) {
    if (fs.existsSync(fixturePath))
      await cleanup(JSON.parse(fs.readFileSync(fixturePath, "utf8")));
    return;
  }
  if (fs.existsSync(fixturePath))
    throw new Error("Clean up the previous verification fixture first.");
  const fixture: Fixture = { users: [], photos: [] };
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const tokens: Record<string, string> = {};
  let keep = false;
  const request = async (
    kind: string,
    path: string,
    method = "GET",
    body?: unknown,
  ) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${tokens[kind]}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  try {
    for (const kind of ["owner", "other", "player", "admin"]) {
      const email = `maidaan-${kind}-${crypto.randomUUID()}@example.com`,
        password = crypto.randomBytes(24).toString("base64url") + "aA1!";
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user)
        throw new Error(error?.message || "User creation failed.");
      fixture.users.push({ id: data.user.id, email, password, kind });
      fs.writeFileSync(fixturePath, JSON.stringify(fixture));
      await SupabaseRepo.createProfile({
        id: data.user.id,
        name: `Verification ${kind}`,
        email,
        role:
          kind === "admin"
            ? "ADMIN"
            : kind === "player"
              ? "PLAYER"
              : "HUB_OWNER",
      });
      const loginClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const login = await loginClient.auth.signInWithPassword({
        email,
        password,
      });
      if (login.error || !login.data.session)
        throw new Error("Temporary account login failed.");
      tokens[kind] = login.data.session.access_token;
    }
    const owner = fixture.users.find((u) => u.kind === "owner")!;
    fixture.hubId = owner.id;
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: owner.id,
      hubName: "Verification Sports Hub",
      location: "Gulberg, Lahore",
      contactNumber: "+923000000000",
      sports: ["cricket", "football", "padel", "badminton"],
      courtCount: 0,
    });
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: fixture.users.find((u) => u.kind === "other")!.id,
      hubName: "Other Verification Hub",
      location: "Lahore",
      sports: ["cricket"],
      courtCount: 0,
    });
    // Small valid PNG verifies the actual storage upload and public retrieval.
    const photo = await request("owner", "/api/hub/photos", "POST", {
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
    });
    assert.equal(photo.status, 201, JSON.stringify(photo.body));
    fixture.photos.push(
      new URL(photo.body.url).pathname.split("/hub-photos/")[1],
    );
    fs.writeFileSync(fixturePath, JSON.stringify(fixture));
    assert.equal((await fetch(photo.body.url)).status, 200);
    const venue = await request("owner", "/api/hub/venue", "PUT", {
      name: "Verification Sports Hub",
      location: "Gulberg III, Lahore",
      contactNumber: "+923000000000",
      sports: ["cricket", "football", "padel", "badminton"],
      latitude: 31.52,
      longitude: 74.35,
      description: "Temporary end-to-end verification venue.",
      photoUrls: [photo.body.url],
    });
    assert.equal(venue.status, 200, JSON.stringify(venue.body));
    assert.equal(venue.body.hub.latitude, 31.52);
    const spaces = [];
    for (const [sport, format] of [
      ["cricket", "Tape-ball"],
      ["football", "5-a-side"],
      ["padel", "Doubles"],
      ["badminton", "Singles"],
    ]) {
      const input = {
        name: `${sport} Court 1`,
        areaName: sport === "cricket" ? "Ground 1" : "Hall 2",
        sport,
        playFormat: format,
        surface: "Artificial turf",
        isIndoor: true,
        playerCapacity: 12,
        status: "AVAILABLE",
        photoUrls: [photo.body.url],
      };
      const result = await request("owner", "/api/hub/spaces", "POST", input);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      spaces.push({ ...input, id: result.body.space.id });
    }
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const slot = {
      courtId: spaces[0].id,
      date,
      startTime: "18:00",
      endTime: "20:00",
      price: "1999.99",
      status: "AVAILABLE",
    };
    assert.equal(
      (await request("owner", "/api/hub/slots", "POST", slot)).status,
      200,
    );
    assert.equal(
      (
        await request("owner", "/api/hub/slots", "POST", {
          ...slot,
          startTime: "19:00",
          endTime: "21:00",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("owner", "/api/hub/slots", "POST", {
          ...slot,
          startTime: "20:00",
          endTime: "22:00",
        })
      ).status,
      200,
    );
    for (const space of spaces.slice(1))
      assert.equal(
        (
          await request("owner", "/api/hub/slots", "POST", {
            ...slot,
            courtId: space.id,
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await request("other", `/api/hub/spaces/${spaces[0].id}`, "PUT", {
          ...spaces[0],
          photoUrls: [],
        })
      ).status,
      404,
    );
    const pub = await request("player", `/api/hubs/${owner.id}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.hub.slots.length, 5);
    assert.equal(pub.body.hub.slots[0].price, 1999.99);
    assert.equal((await request("player", "/api/admin/accounts")).status, 403);
    assert.equal(
      (
        await request(
          "admin",
          "/api/admin/accounts?role=HUB_OWNER&search=Verification",
        )
      ).status,
      200,
    );
    const details = await request("admin", `/api/admin/accounts/${owner.id}`);
    assert.equal(details.status, 200, JSON.stringify(details.body));
    assert.equal(
      (
        await request(
          "admin",
          `/api/admin/accounts/${owner.id}/status`,
          "PATCH",
          { action: "SUSPENDED", reason: "Live verification suspension" },
        )
      ).status,
      200,
    );
    assert.equal((await request("owner", "/api/hub/venue")).status, 401);
    assert.equal(
      (await request("player", `/api/hubs/${owner.id}`)).status,
      404,
    );
    assert.equal(
      (
        await request(
          "admin",
          `/api/admin/accounts/${owner.id}/status`,
          "PATCH",
          { action: "REINSTATED", reason: "Live verification reinstatement" },
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("player", `/api/hubs/${owner.id}`)).body.hub.slots.length,
      5,
    );
    const player = fixture.users.find((u) => u.kind === "player")!;
    assert.equal(
      (
        await request(
          "admin",
          `/api/admin/accounts/${player.id}/superuser`,
          "PATCH",
          { grant: true },
        )
      ).status,
      200,
    );
    assert.equal((await request("player", "/api/admin/accounts")).status, 200);
    assert.equal(
      (
        await request(
          "admin",
          `/api/admin/accounts/${player.id}/superuser`,
          "PATCH",
          { grant: false },
        )
      ).status,
      200,
    );
    assert.equal((await request("player", "/api/admin/accounts")).status, 403);
    console.log(
      "PASS live Supabase: photo upload/retrieval, venue location, four sports, priced slots, overlap constraint, ownership, admin authorization, account filtering/details, suspend/reinstate, grant/revoke.",
    );
    keep = process.argv.includes("--keep");
    if (keep) {
      fs.writeFileSync(fixturePath, JSON.stringify(fixture));
      console.log(
        "Temporary fixture retained for browser verification; run --cleanup afterward.",
      );
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (!keep) await cleanup(fixture);
  }
}
main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
