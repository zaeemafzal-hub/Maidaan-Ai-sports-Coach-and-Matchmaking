// Private CLI only: never expose this bootstrap operation as a public endpoint.
import {
  supabaseAdmin,
  isServerSupabaseConfigured,
} from "../src/lib/supabase.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!isServerSupabaseConfigured || !email || !email.includes("@"))
    throw new Error(
      "Usage: npm run admin:grant -- existing-account@example.com (with backend credentials configured).",
    );
  let target;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error(error.message);
    target = data.users.find((u) => u.email?.toLowerCase() === email);
    if (target || data.users.length < 100) break;
  }
  if (!target?.email_confirmed_at)
    throw new Error(
      "Sign up and verify this account before granting super-user access.",
    );
  let profile = await SupabaseRepo.getProfile(target.id);
  if (!profile)
    profile = await SupabaseRepo.createProfile({
      id: target.id,
      email,
      name:
        target.user_metadata?.full_name ||
        target.user_metadata?.name ||
        email.split("@")[0],
      role: "PLAYER",
    });
  if (profile.account_status === "SUSPENDED")
    throw new Error("Reinstate this account first.");
  await SupabaseRepo.addRole(target.id, "ADMIN");
  console.log(
    "Super-user access granted to the requested existing account. Sign out and sign in again to refresh capabilities.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
