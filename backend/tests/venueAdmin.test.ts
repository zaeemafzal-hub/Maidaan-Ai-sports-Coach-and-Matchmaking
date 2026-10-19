import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
import { parseSlot } from "../src/controllers/venueController.js";
process.env.NODE_ENV = "test";

test("venue availability and account moderation boundaries", async (t) => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const ids = {
    owner: "00000000-0000-0000-0000-000000008001",
    other: "00000000-0000-0000-0000-000000008002",
    player: "00000000-0000-0000-0000-000000008003",
    admin: "00000000-0000-0000-0000-000000008004",
  };
  async function request(
    who: keyof typeof ids,
    path: string,
    method = "GET",
    body?: unknown,
  ) {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as any).port}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer test_token:${ids[who]}:test%40example.com`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return { status: response.status, body: (await response.json()) as any };
  }
  for (const [who, id] of Object.entries(ids))
    await SupabaseRepo.createProfile({
      id,
      name: who,
      email: `${who}@example.com`,
      role:
        who === "admin" ? "ADMIN" : who === "player" ? "PLAYER" : "HUB_OWNER",
    });
  await SupabaseRepo.upsertHubOwnerProfile({
    userId: ids.owner,
    hubName: "Availability Test Hub",
    sports: ["cricket", "badminton"],
    location: "Gulberg, Lahore",
    courtCount: 0,
  });
  await SupabaseRepo.upsertHubOwnerProfile({
    userId: ids.other,
    hubName: "Other Hub",
    sports: ["cricket"],
    location: "Model Town, Lahore",
    courtCount: 0,
  });
  let courtId = "",
    slotId = "";
  const space = {
    name: "Pitch 1",
    sport: "cricket",
    areaName: "Ground 1",
    playFormat: "Tape-ball",
    surface: "Turf",
    isIndoor: true,
    playerCapacity: 12,
    status: "AVAILABLE",
    photoUrls: [],
  };
  const slot = () => ({
    courtId,
    date: "2035-01-10",
    startTime: "18:00",
    endTime: "20:00",
    price: "1999.99",
    status: "AVAILABLE",
  });
  try {
    await t.test("only owners publish playing spaces", async () => {
      assert.equal(
        (await request("player", "/api/hub/spaces", "POST", space)).status,
        403,
      );
      const result = await request("owner", "/api/hub/spaces", "POST", space);
      assert.equal(result.status, 200);
      courtId = result.body.space.id;
      assert.equal(result.body.space.areaName, "Ground 1");
    });
    await t.test("cross-owner edits and deletion are rejected", async () => {
      assert.equal(
        (await request("other", `/api/hub/spaces/${courtId}`, "PUT", space))
          .status,
        404,
      );
      assert.equal(
        (await request("other", `/api/hub/spaces/${courtId}`, "DELETE")).status,
        404,
      );
    });
    await t.test(
      "sport format and foreign photo paths are validated",
      async () => {
        assert.equal(
          (
            await request("owner", "/api/hub/spaces", "POST", {
              ...space,
              name: "Bad format",
              playFormat: "Doubles",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request("owner", "/api/hub/spaces", "POST", {
              ...space,
              name: "Bad photo",
              photoUrls: ["https://example.com/private.jpg"],
            })
          ).status,
          400,
        );
      },
    );
    await t.test("calendar dates, money and future times validated", () => {
      for (const input of [
        { ...slot(), date: "2035-02-30" },
        { ...slot(), price: "1.999" },
        { ...slot(), price: true },
        { ...slot(), endTime: "17:00" },
        { ...slot(), date: "2000-01-01" },
      ])
        assert.throws(() => parseSlot(input));
      assert.equal(parseSlot(slot()).price, 1999.99);
    });
    await t.test(
      "publish slot, reject overlap, allow adjacent hours",
      async () => {
        const result = await request("owner", "/api/hub/slots", "POST", slot());
        assert.equal(result.status, 200);
        slotId = result.body.slot.id;
        assert.equal(
          (
            await request("owner", "/api/hub/slots", "POST", {
              ...slot(),
              startTime: "19:00",
              endTime: "21:00",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request("owner", "/api/hub/slots", "POST", {
              ...slot(),
              startTime: "20:00",
              endTime: "22:00",
            })
          ).status,
          200,
        );
      },
    );
    await t.test("players see real prices and slots", async () => {
      const result = await request("player", `/api/hubs/${ids.owner}`);
      assert.equal(result.status, 200);
      assert.equal(result.body.hub.slots.length, 2);
      assert.equal(result.body.hub.slots[0].price, 1999.99);
    });
    await t.test("cross-owner slot writes rejected", async () => {
      assert.equal(
        (await request("other", `/api/hub/slots/${slotId}`, "PUT", slot()))
          .status,
        404,
      );
      assert.equal(
        (await request("other", `/api/hub/slots/${slotId}`, "DELETE")).status,
        404,
      );
    });
    await t.test(
      "unavailable space hides its slots and restores them",
      async () => {
        await request("owner", `/api/hub/spaces/${courtId}`, "PUT", {
          ...space,
          status: "UNAVAILABLE",
        });
        assert.equal(
          (await request("player", `/api/hubs/${ids.owner}`)).body.hub.slots
            .length,
          0,
        );
        await request("owner", `/api/hub/spaces/${courtId}`, "PUT", space);
      },
    );
    await t.test(
      "players cannot manage accounts or forge admin role",
      async () => {
        assert.equal(
          (await request("player", "/api/admin/accounts")).status,
          403,
        );
        assert.equal(
          (
            await request(
              "player",
              `/api/admin/accounts/${ids.owner}/status`,
              "PATCH",
              { action: "SUSPENDED", reason: "Test reason", role: "ADMIN" },
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "suspension blocks existing token and hides hub, reinstatement preserves slots",
      async () => {
        assert.equal(
          (
            await request(
              "admin",
              `/api/admin/accounts/${ids.owner}/status`,
              "PATCH",
              { action: "SUSPENDED", reason: "Rules violation test" },
            )
          ).status,
          200,
        );
        assert.equal((await request("owner", "/api/hub/venue")).status, 401);
        assert.equal(
          (await request("player", `/api/hubs/${ids.owner}`)).status,
          404,
        );
        assert.ok(
          !(await SupabaseRepo.getHubs()).some((h) => h.user_id === ids.owner),
        );
        assert.equal(
          (
            await request(
              "admin",
              `/api/admin/accounts/${ids.owner}/status`,
              "PATCH",
              { action: "REINSTATED", reason: "Review completed" },
            )
          ).status,
          200,
        );
        assert.equal(
          (await request("owner", "/api/hub/venue")).body.hub.slots.length,
          2,
        );
      },
    );
    await t.test("admin grant, revoke and self-protection", async () => {
      assert.equal(
        (
          await request(
            "admin",
            `/api/admin/accounts/${ids.admin}/superuser`,
            "PATCH",
            { grant: false },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "admin",
            `/api/admin/accounts/${ids.player}/superuser`,
            "PATCH",
            { grant: true },
          )
        ).status,
        200,
      );
      assert.equal(
        (await request("player", "/api/admin/accounts")).status,
        200,
      );
      assert.equal(
        (
          await request(
            "admin",
            `/api/admin/accounts/${ids.player}/superuser`,
            "PATCH",
            { grant: false },
          )
        ).status,
        200,
      );
      assert.equal(
        (await request("player", "/api/admin/accounts")).status,
        403,
      );
    });
    await t.test("account details include moderation history", async () => {
      const result = await request("admin", `/api/admin/accounts/${ids.owner}`);
      assert.equal(result.status, 200);
      assert.equal(result.body.history.length, 2);
      assert.equal(result.body.hub.hub_name, "Availability Test Hub");
    });
    await t.test("removing a space removes its slots", async () => {
      assert.equal(
        (await request("owner", `/api/hub/spaces/${courtId}`, "DELETE")).status,
        200,
      );
      assert.equal(
        (await request("owner", "/api/hub/venue")).body.hub.slots.length,
        0,
      );
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
