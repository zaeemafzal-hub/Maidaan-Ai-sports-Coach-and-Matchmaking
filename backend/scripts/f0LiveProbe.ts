import fs from "node:fs";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
async function main() {
  const sessions = JSON.parse(
    fs.readFileSync("../output/.env.f0-sessions.json", "utf8"),
  );
  const mobile = dotenv.parse(fs.readFileSync("../mobile/.env"));
  const publicClient = (actor: string) =>
    createClient(
      process.env.SUPABASE_URL!,
      mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${sessions[actor].session.access_token}`,
          },
        },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  const player = publicClient("PLAYER_B"),
    outside = publicClient("PLAYER_A");
  const room = sessions.roomId,
    match = sessions.matchId,
    cap = sessions.CAPTAIN_A.id;
  const p = await player
    .from("chat_room_members")
    .select("id")
    .eq("room_id", room);
  assert.equal(p.error, null);
  assert.ok(p.data!.length >= 2);
  const outsiders = await outside
    .from("chat_room_members")
    .select("id")
    .eq("room_id", room);
  assert.equal(outsiders.error, null);
  assert.equal(outsiders.data!.length, 0);
  const participants = await player
    .from("match_participants")
    .select("id")
    .eq("match_id", match);
  assert.equal(participants.error, null);
  assert.ok(participants.data!.length >= 1);
  const forbidden = await outside.rpc("update_match_recruitment", {
    p_match_id: match,
    p_captain_id: cap,
    p_open_slots: 1,
  });
  assert.ok(forbidden.error);
  assert.match(forbidden.error.message, /permission denied/i);
  const results: any[] = [
    {
      ordinaryAuthenticatedRls: true,
      recursivePolicies: false,
      outsiderRows: 0,
      forgedActorRpcDenied: true,
    },
  ];
  for (let n = 0; n < 3; n++) {
    const m = await SupabaseRepo.createMatch({
      captainId: cap,
      title: "F0 DISPOSABLE concurrency " + n,
      sport: "cricket",
      date: "2099-01-01",
      startTime: "20:00",
      venueName: "F0 TEST ONLY",
      area: "Gulberg",
      skillLevel: "beginner",
      totalCapacity: 2,
      openSlots: 2,
    });
    const requests = [];
    for (const actor of ["PLAYER_A", "PLAYER_B"])
      requests.push(
        await SupabaseRepo.createJoinRequest({
          matchId: m.id,
          playerId: sessions[actor].id,
        }),
      );
    const race = await Promise.all([
      supabaseAdmin.rpc("update_match_recruitment", {
        p_match_id: m.id,
        p_captain_id: cap,
        p_open_slots: 2,
      }),
      ...requests.map((r) =>
        supabaseAdmin.rpc("accept_join_request", {
          p_request_id: r.id,
          p_captain_id: cap,
        }),
      ),
    ]);
    const after = await supabaseAdmin
      .from("matches")
      .select("open_slots,total_capacity")
      .eq("id", m.id)
      .single();
    const count = await supabaseAdmin
      .from("match_participants")
      .select("id", { head: true, count: "exact" })
      .eq("match_id", m.id);
    assert.equal(after.error, null);
    assert.equal(count.error, null);
    assert.ok(
      count.count! + after.data!.open_slots <= after.data!.total_capacity,
    );
    assert.ok(after.data!.open_slots >= 0);
    results.push({
      liveConcurrencyCase: n + 1,
      confirmed: count.count,
      openSlots: after.data!.open_slots,
      totalCapacity: after.data!.total_capacity,
      recruitmentRejected: !!race[0].error,
    });
  }
  fs.writeFileSync(
    "../output/f0-live-security-capacity.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
}
main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
