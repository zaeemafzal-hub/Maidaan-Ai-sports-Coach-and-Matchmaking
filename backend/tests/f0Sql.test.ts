import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

test("F0 incremental migration, roster, capacity, durable retry keys and ordinary-role RLS", async (t) => {
  const db = new PGlite({ extensions: { btree_gist } });
  const ids = Array.from(
    { length: 6 },
    (_, n) => `00000000-0000-0000-0000-${String(9401 + n).padStart(12, "0")}`,
  );
  const [captain, player, other, match, request, room] = ids;
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;create schema storage;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select current_user::text$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const file of fs
      .readdirSync(dir)
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      try {
        await db.exec(fs.readFileSync(new URL(file, dir), "utf8"));
      } catch (e) {
        throw new Error(file + ": " + (e as Error).message);
      }
    }
    await db.exec(
      fs.readFileSync(
        new URL("20261018000001_f0_stabilization.sql", dir),
        "utf8",
      ),
    );
    await db.query(`insert into auth.users values($1),($2),($3)`, [
      captain,
      player,
      other,
    ]);
    for (const id of [captain, player, other])
      await db.query(
        `insert into profiles(id,name,email,role) values($1,'F0 Test','f0@example.com','PLAYER')`,
        [id],
      );
    await db.query(
      `insert into user_roles(user_id,role,status) values($1,'TEAM_CAPTAIN','ACTIVE')`,
      [captain],
    );
    await db.query(
      `insert into teams(captain_id,name,sport,skill_level,area) values($1,'F0 Squad','cricket','beginner','Gulberg')`,
      [captain],
    );
    await t.test("one team per captain enforced by PostgreSQL", async () => {
      await assert.rejects(
        db.query(
          `insert into teams(captain_id,name,sport,skill_level,area) values($1,'Duplicate','cricket','beginner','Gulberg')`,
          [captain],
        ),
        /unique|duplicate/i,
      );
    });
    await t.test("canonical roster labels and statuses", async () => {
      await db.query(
        `insert into team_members(team_id,user_id,member_role,status) select id,$1,'VICE_CAPTAIN','INVITED' from teams where captain_id=$2`,
        [player, captain],
      );
      await assert.rejects(
        db.query(`update team_members set status='INACTIVE'`),
        /check constraint/,
      );
      assert.equal(
        (
          await db.query(
            `select * from user_roles where user_id=$1 and role='TEAM_CAPTAIN'`,
            [player],
          )
        ).rows.length,
        0,
      );
    });
    await db.query(
      `insert into matches(id,captain_id,title,sport,date,start_time,venue_name,area,skill_level,total_capacity,open_slots,status) values($1,$2,'F0 future','cricket','2099-01-01','20:00','Test court','Gulberg','beginner',2,2,'OPEN')`,
      [match, captain],
    );
    await db.query(
      `insert into join_requests(id,match_id,player_id,status) values($1,$2,$3,'PENDING')`,
      [request, match, player],
    );
    await t.test(
      "concurrent recruitment and acceptance preserve capacity",
      async () => {
        await Promise.all([
          db.query(`select update_match_recruitment($1,$2,2)`, [
            match,
            captain,
          ]),
          db.query(`select accept_join_request($1,$2)`, [request, captain]),
        ]);
        await assert.rejects(
          db.query(`select update_match_recruitment($1,$2,2)`, [
            match,
            captain,
          ]),
          /remaining capacity/,
        );
        const r = await db.query<any>(
          `select open_slots,total_capacity,(select count(*)::int from match_participants where match_id=$1) n from matches where id=$1`,
          [match],
        );
        assert.ok(
          r.rows[0].n + r.rows[0].open_slots <= r.rows[0].total_capacity,
        );
        assert.equal(
          (
            await db.query(
              `select * from notifications where join_request_id=$1`,
              [request],
            )
          ).rows.length,
          1,
        );
        await db.query(`select accept_join_request($1,$2)`, [request, captain]);
        assert.equal(
          (
            await db.query(
              `select * from notifications where join_request_id=$1`,
              [request],
            )
          ).rows.length,
          1,
        );
      },
    );
    await db.query(
      `insert into chat_rooms(id,type,match_id) values($1,'GROUP',$2)`,
      [room, match],
    );
    await db.query(
      `insert into chat_room_members(room_id,user_id) values($1,$2),($1,$3)`,
      [room, captain, player],
    );
    await db.query(
      `insert into chat_messages(room_id,sender_id,body,client_message_id) values($1,$2,'hello','retry_1')`,
      [room, captain],
    );
    await t.test("durable message retry uniqueness", async () => {
      await assert.rejects(
        db.query(
          `insert into chat_messages(room_id,sender_id,body,client_message_id) values($1,$2,'retry','retry_1')`,
          [room, captain],
        ),
        /unique|duplicate/i,
      );
    });
    await t.test(
      "all application definer functions pin path and mutation ACL",
      async () => {
        const defs = await db.query<any>(
          `select proname,proconfig,has_function_privilege('authenticated',oid,'EXECUTE') allowed from pg_proc where pronamespace='public'::regnamespace and prosecdef`,
        );
        for (const f of defs.rows) {
          assert.ok(
            f.proconfig?.some((s: string) => s.startsWith("search_path=")),
            f.proname,
          );
          assert.equal(
            f.allowed,
            ["is_chat_member", "is_match_member"].includes(f.proname),
            f.proname,
          );
        }
      },
    );
    await db.exec(
      `grant usage on schema public,auth to authenticated;grant select on all tables in schema public to authenticated;set role authenticated;`,
    );
    await t.test(
      "authenticated participant reads without RLS recursion; outsider denied",
      async () => {
        await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
          player,
        ]);
        assert.equal(
          (await db.query(`select * from chat_room_members`)).rows.length,
          2,
        );
        assert.equal(
          (await db.query(`select * from match_participants`)).rows.length,
          1,
        );
        assert.equal(
          (await db.query(`select * from chat_messages`)).rows.length,
          1,
        );
        await assert.rejects(
          db.query(`select accept_join_request($1,$2)`, [request, captain]),
          /permission denied/,
        );
        await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
          other,
        ]);
        assert.equal(
          (await db.query(`select * from chat_room_members`)).rows.length,
          0,
        );
        assert.equal(
          (await db.query(`select * from match_participants`)).rows.length,
          0,
        );
        assert.equal(
          (await db.query(`select * from chat_messages`)).rows.length,
          0,
        );
        assert.equal(
          (await db.query(`select * from join_requests`)).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
