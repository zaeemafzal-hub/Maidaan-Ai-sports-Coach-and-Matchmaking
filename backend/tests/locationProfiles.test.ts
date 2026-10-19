import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import app from "../src/app.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
import { VenueRepo } from "../src/models/venueRepo.js";
import { parseVenue } from "../src/controllers/venueController.js";
import { serviceCities } from "../src/config/locations.js";
import { supabaseAdmin } from "../src/lib/supabase.js";
process.env.NODE_ENV = "test";

test("Lahore catalogue, private player contact fields and venue search", async (t) => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const player = "00000000-0000-0000-0000-000000007101",
    owner = "00000000-0000-0000-0000-000000007102",
    other = "00000000-0000-0000-0000-000000007103";
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  async function request(path: string, body?: unknown, id = player) {
    const r = await fetch(base + path, {
      method: body ? "PUT" : "GET",
      headers: {
        Authorization: `Bearer test_token:${id}:test%40example.com`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: (await r.json()) as any };
  }
  try {
    for (const [id, role] of [
      [player, "PLAYER"],
      [owner, "HUB_OWNER"],
      [other, "PLAYER"],
    ] as const)
      await SupabaseRepo.createProfile({
        id,
        role,
        name: "Location test",
        email: "test@example.com",
      });
    await t.test(
      "only enabled city and searchable major areas are returned",
      async () => {
        const r = await request("/api/locations");
        assert.equal(r.status, 200);
        assert.deepEqual(
          r.body.cities.map((c: any) => c.id),
          ["lahore"],
        );
        assert.ok(r.body.cities[0].areas.length > 80);
        assert.ok(
          r.body.cities[0].areas.some((a: any) =>
            a.aliases.includes("Cantonment"),
          ),
        );
        assert.equal(
          new Set(serviceCities[0].areas.map((a) => a.id)).size,
          serviceCities[0].areas.length,
        );
      },
    );
    const profile = {
      preferredSports: ["cricket"],
      skillLevel: "intermediate",
      primaryLocation: "Gulberg, Lahore",
      phone: "0300 1234567",
      cityId: "lahore",
      areaId: "gulberg",
      avatarUrl: "",
    };
    await t.test(
      "phone and an enabled city are mandatory; invalid explicit area IDs are rejected",
      async () => {
        for (const change of [
          { phone: "" },
          { phone: "123" },
          { cityId: "karachi" },
          { areaId: "made-up-area" },
        ])
          assert.equal(
            (await request("/api/profile/player", { ...profile, ...change }))
              .status,
            400,
          );
        assert.equal(
          (await request("/api/profile/me")).body.onboarding.player,
          false,
        );
      },
    );
    await t.test(
      "phone is normalized and the full address is preserved",
      async () => {
        const r = await request("/api/profile/player", {
          ...profile,
          primaryLocation: "House 12, Gulberg, Lahore",
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.profile.phone, "+923001234567");
        assert.equal(
          r.body.profile.primaryLocation,
          "House 12, Gulberg, Lahore",
        );
        assert.equal(r.body.profile.areaId, "gulberg");
        const me = (await request("/api/profile/me")).body;
        assert.equal(me.onboarding.player, true);
        assert.equal(me.playerProfile.phone, "+923001234567");
        const another = (await request("/api/profile/me", undefined, other))
          .body;
        assert.equal(another.playerProfile, null);
      },
    );
    await t.test(
      "unlisted addresses save without a catalogue area, and known addresses are tagged",
      async () => {
        for (const [address, expectedArea] of [
          ["House 15, New Colony", ""],
          ["House 12, Street 5, DHA Phase 5, Lahore", "dha-phase-5"],
          ["Near Gulbergian Street", ""],
        ]) {
          const saved = await request("/api/profile/player", {
            ...profile,
            areaId: "",
            primaryLocation: address,
          });
          assert.equal(saved.status, 200, JSON.stringify(saved.body));
          assert.equal(saved.body.profile.primaryLocation, address);
          assert.equal(saved.body.profile.areaId, expectedArea);
          assert.equal(
            (await request("/api/profile/me")).body.onboarding.player,
            true,
          );
        }
        for (const address of ["", " ", "x".repeat(501)])
          assert.equal(
            (
              await request("/api/profile/player", {
                ...profile,
                primaryLocation: address,
              })
            ).status,
            400,
          );
      },
    );
    await t.test(
      "arbitrary and traversing profile photo URLs are rejected",
      async () => {
        assert.equal(
          (
            await request("/api/profile/player", {
              ...profile,
              avatarUrl: "https://example.com/other.png",
            })
          ).status,
          400,
        );
        const prefix = supabaseAdmin.storage
          .from("profile-photos")
          .getPublicUrl(`${player}/`).data.publicUrl;
        assert.equal(
          (
            await request("/api/profile/player", {
              ...profile,
              avatarUrl: prefix + "../someone-else/avatar.png",
            })
          ).status,
          400,
        );
      },
    );
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: owner,
      hubName: "Area Search Hub",
      sports: ["padel"],
      location: "Main Boulevard, Lahore",
      courtCount: 0,
    });
    await VenueRepo.saveDetails(owner, {
      hubName: "Area Search Hub",
      sports: ["padel"],
      location: "Main Boulevard, Lahore",
      contactNumber: "+923001234567",
      cityId: "lahore",
      areaId: "dha-phase-5",
      latitude: 31.46,
      longitude: 74.41,
      description: "Padel courts",
      photoUrls: [],
    });
    await t.test(
      "city, exact area, venue-name and area-text searches return related venues",
      async () => {
        assert.equal(
          (await VenueRepo.publicHubs(undefined, "DHA Phase 5")).length,
          1,
        );
        assert.equal(
          (await VenueRepo.publicHubs(undefined, "area search")).length,
          1,
        );
        assert.equal(
          (await VenueRepo.publicHubs(undefined, "", "lahore", "dha-phase-5"))
            .length,
          1,
        );
        assert.equal(
          (await VenueRepo.publicHubs(undefined, "", "lahore", "gulberg"))
            .length,
          0,
        );
        assert.equal(
          (await VenueRepo.publicHubs(undefined, "", "karachi")).length,
          0,
        );
        const r = await request("/api/hubs?city=lahore&area=dha-phase-5");
        assert.equal(r.body.hubs.length, 1);
        assert.equal(
          (await request("/api/hubs?areaSearch=Johar")).body.hubs.length,
          0,
        );
        assert.equal(
          (await request("/api/hubs?areaSearch=DHA")).body.hubs.length,
          1,
        );
      },
    );
    await t.test("new venue area and pin cannot claim another city", () => {
      const input = {
        name: "Test",
        sports: ["cricket"],
        cityId: "lahore",
        areaId: "gulberg",
        location: "Lahore",
        photoUrls: [],
        latitude: 24.86,
        longitude: 67.01,
      };
      assert.throws(() => parseVenue(input, owner), /inside Lahore/);
      assert.throws(
        () =>
          parseVenue(
            { ...input, latitude: null, longitude: null, areaId: "unknown" },
            owner,
          ),
        /Select/,
      );
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("location/profile migration is repeatable and preserves cities and existing contact data", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table player_profiles(primary_location text);
      create table hub_owner_profiles(location text);
      insert into player_profiles values('Gulberg, Lahore');
      insert into hub_owner_profiles values('Karachi'),('Lahore');`);
    const sql = fs.readFileSync(
      new URL(
        "../../supabase/migrations/20261017000003_location_profiles.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const result = await db.query<{ location: string; city_id: string | null }>(
      "select location,city_id from hub_owner_profiles order by location",
    );
    assert.deepEqual(result.rows, [
      { location: "Karachi", city_id: null },
      { location: "Lahore", city_id: "lahore" },
    ]);
    assert.equal(
      (await db.query("select * from player_profiles")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
