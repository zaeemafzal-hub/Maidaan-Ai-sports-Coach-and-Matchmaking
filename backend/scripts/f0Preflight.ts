import { supabaseAdmin } from "../src/lib/supabase.js";
async function main() {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("captain_id");
  if (error)
    throw new Error("Could not inspect existing teams: " + error.message);
  const counts = new Map<string, number>();
  for (const row of data || [])
    counts.set(row.captain_id, (counts.get(row.captain_id) || 0) + 1);
  console.log(
    JSON.stringify({
      teams: data?.length,
      duplicateCaptainGroups: [...counts.values()].filter((n) => n > 1).length,
    }),
  );
}
main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
