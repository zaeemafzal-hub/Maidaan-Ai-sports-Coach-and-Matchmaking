import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import fs from "node:fs";

test("booking migration and transactional payment/cancellation rules", async (t) => {
  const db = new PGlite({ extensions: { btree_gist } });
  const owner = "00000000-0000-0000-0000-000000009001",
    player = "00000000-0000-0000-0000-000000009002",
    other = "00000000-0000-0000-0000-000000009003",
    court = "00000000-0000-0000-0000-000000009004",
    admin = "00000000-0000-0000-0000-000000009005";
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create schema auth;create schema storage;
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create function auth.role() returns text language sql as $$select 'service_role'::text$$;
      create table profiles(id uuid primary key,updated_at timestamptz default now());
      create table hub_owner_profiles(user_id uuid primary key,hub_name text,location text);
      create table hub_courts(id uuid primary key,hub_owner_id uuid,name text,status text);
      create table user_roles(user_id uuid references profiles(id),role text,status text,unique(user_id,role));
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    await db.exec(
      fs.readFileSync(
        new URL(
          "../../supabase/migrations/20261017000001_hub_availability_and_account_moderation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const migration = fs.readFileSync(
      new URL(
        "../../supabase/migrations/20261017000002_venue_bookings.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.query("insert into profiles(id) values($1),($2),($3),($4)", [
      owner,
      player,
      other,
      admin,
    ]);
    for (const [id, role] of [
      [owner, "HUB_OWNER"],
      [player, "PLAYER"],
      [other, "PLAYER"],
      [admin, "ADMIN"],
    ])
      await db.query("insert into user_roles values($1,$2,'ACTIVE')", [
        id,
        role,
      ]);
    await db.query(
      "insert into hub_owner_profiles(user_id,hub_name,location) values($1,'Test Hub','Lahore')",
      [owner],
    );
    await db.query(
      "insert into hub_courts(id,hub_owner_id,name,status) values($1,$2,'Pitch 1','AVAILABLE')",
      [court, owner],
    );
    async function slot(
      hours = 72,
      policy = "FULL_OR_ADVANCE",
      refund = "KEEP_ADVANCE",
    ) {
      const r = await db.query<{ id: string }>(
        "insert into hub_slots(court_id,starts_at,ends_at,price,booking_enabled,payment_policy,cancellation_refund) values($1,now()+make_interval(hours=>$2),now()+make_interval(hours=>$2)+interval '1 hour',1999.99,true,$3,$4) returning id",
        [court, hours, policy, refund],
      );
      return r.rows[0].id;
    }
    async function start(id: string, user = player, choice = "ADVANCE") {
      return (
        await db.query<any>(
          "select start_venue_booking($1,$2,'safepay',$3) as b",
          [user, id, choice],
        )
      ).rows[0].b;
    }
    async function paid(b: any, event = "evt_1") {
      await db.query(
        "update venue_bookings set payment_reference=$2 where id=$1",
        [b.id, "track_" + b.id],
      );
      return (
        await db.query<any>(
          "select settle_venue_booking($1,$2,'safepay',$3,$4,'PKR','PAID') as b",
          [b.id, "track_" + b.id, event, b.upfront_minor],
        )
      ).rows[0].b;
    }
    await t.test(
      "snapshots exact prices, blocks double booking and preserves idempotency",
      async () => {
        const id = await slot();
        const b = await start(id);
        assert.equal(b.upfront_minor, 50000);
        assert.equal(b.total_minor, 199999);
        assert.equal((await start(id)).id, b.id);
        await assert.rejects(start(id, other), { code: "23505" });
        await assert.rejects(
          db.query("update hub_slots set price=3000 where id=$1", [id]),
          { code: "23505" },
        );
        const result = await paid(b);
        assert.equal(result.status, "CONFIRMED");
        assert.equal((await paid(b)).paid_minor, 50000);
        await assert.rejects(
          db.query("delete from hub_slots where id=$1", [id]),
          (error: any) => ["23503", "23001"].includes(error.code),
        );
      },
    );
    await t.test(
      "enforces full-only option and zero-upfront rejection",
      async () => {
        const id = await slot(75, "FULL_ONLY");
        await assert.rejects(start(id, player, "ADVANCE"), { code: "22023" });
        const b = await start(id, player, "FULL");
        assert.equal(b.upfront_minor, b.total_minor);
        const zero = await slot(77);
        await db.query("update hub_slots set price=0 where id=$1", [zero]);
        await assert.rejects(start(zero), { code: "23505" });
      },
    );
    await t.test(
      "cancel before deadline keeps only the disclosed advance from a full payment",
      async () => {
        const b = await paid(
          await start(await slot(80), player, "FULL"),
          "evt_full",
        );
        const r = (
          await db.query<any>(
            "select cancel_venue_booking($1,$2,'Changed plans') as b",
            [player, b.id],
          )
        ).rows[0].b;
        assert.equal(r.status, "CANCELLED");
        assert.equal(r.refund_due_minor, 149999);
        assert.equal(r.refund_status, "PENDING");
        await assert.rejects(
          db.query("select record_venue_refund($1,$2,'refund_1')", [
            player,
            b.id,
          ]),
          { code: "42501" },
        );
        const refund = (
          await db.query<any>(
            "select record_venue_refund($1,$2,'refund_1') as b",
            [admin, b.id],
          )
        ).rows[0].b;
        assert.equal(refund.refunded_minor, 149999);
        assert.equal(refund.refund_status, "REFUNDED");
      },
    );
    await t.test(
      "full refunds before deadline, no refunds after deadline, owners refund fully",
      async () => {
        const full = await paid(
          await start(await slot(85, "FULL_OR_ADVANCE", "FULL")),
          "evt_refund",
        );
        const r = (
          await db.query<any>(
            "select cancel_venue_booking($1,$2,'Changed plans') as b",
            [player, full.id],
          )
        ).rows[0].b;
        assert.equal(r.refund_due_minor, 50000);
        const late = await paid(await start(await slot(2)), "evt_late");
        const l = (
          await db.query<any>(
            "select cancel_venue_booking($1,$2,'Changed plans') as b",
            [player, late.id],
          )
        ).rows[0].b;
        assert.equal(l.refund_due_minor, 0);
        const own = await paid(await start(await slot(4)), "evt_owner");
        const o = (
          await db.query<any>(
            "select cancel_venue_booking($1,$2,'Venue is closed') as b",
            [owner, own.id],
          )
        ).rows[0].b;
        assert.equal(o.refund_due_minor, 50000);
      },
    );
    await t.test(
      "late successful payments never take a slot from a new customer",
      async () => {
        const id = await slot(90),
          old = await start(id);
        await db.query(
          "update venue_bookings set hold_expires_at=now()-interval '1 minute' where id=$1",
          [old.id],
        );
        const next = await start(id, other);
        const late = await paid(old, "evt_delayed");
        assert.equal(late.status, "EXPIRED");
        assert.equal(late.refund_due_minor, late.paid_minor);
        assert.equal(
          (
            await db.query<any>(
              "select status from venue_bookings where id=$1",
              [next.id],
            )
          ).rows[0].status,
          "PAYMENT_PENDING",
        );
      },
    );
    await t.test(
      "forged amount, currency, reference and outsider cancellation are rejected",
      async () => {
        const b = await start(await slot(95));
        await db.query(
          "update venue_bookings set payment_reference=$2 where id=$1",
          [b.id, "track_guard"],
        );
        for (const [ref, amount, currency] of [
          ["track_guard", 1, "PKR"],
          ["wrong", 50000, "PKR"],
          ["track_guard", 50000, "USD"],
        ])
          await assert.rejects(
            db.query(
              "select settle_venue_booking($1,$2,'safepay','forged',$3,$4,'PAID')",
              [b.id, ref, amount, currency],
            ),
            { code: "22023" },
          );
        await assert.rejects(
          db.query(
            "select cancel_venue_booking($1,$2,'Outsider cancellation')",
            [other, b.id],
          ),
          { code: "42501" },
        );
      },
    );
    await t.test(
      "browser roles cannot execute trusted payment functions",
      async () => {
        await db.exec("set role authenticated");
        await assert.rejects(
          db.query(
            "select settle_venue_booking($1,'x','safepay','x',1,'PKR','PAID')",
            [crypto.randomUUID()],
          ),
          { code: "42501" },
        );
        await db.exec("reset role");
      },
    );
  } finally {
    await db.close();
  }
});
