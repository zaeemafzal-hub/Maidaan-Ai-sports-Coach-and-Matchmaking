import { supabaseAdmin } from "../lib/supabase.js";
import { allowsMemoryStores } from "../config/runtime.js";
import { SupabaseRepo, Role } from "./supabaseRepo.js";
import { VenueError } from "./venueRepo.js";

const memoryLog: Record<string, unknown>[] = [];
function databaseError(error: { code?: string; message: string }): never {
  const status =
    error.code === "42501"
      ? 403
      : error.code === "P0002"
        ? 404
        : error.code === "23505"
          ? 409
          : error.code === "22023"
            ? 400
            : 500;
  throw new VenueError(
    status,
    status === 500 ? "Unable to update this account." : error.message,
  );
}
export const AccountAdminRepo = {
  async assertAdmin(actor: string) {
    const profile = await SupabaseRepo.getProfile(actor);
    if (
      !profile ||
      profile.account_status === "SUSPENDED" ||
      !(await SupabaseRepo.hasRole(actor, "ADMIN"))
    )
      throw new VenueError(403, "Super-user access required.");
  },
  async list(search: string, role?: Role, status?: string, page = 0) {
    const size = 30;
    let profiles;
    let total: number;
    if (allowsMemoryStores()) {
      let rows = SupabaseRepo.listMemoryProfiles();
      if (search)
        rows = rows.filter((p) =>
          `${p.name} ${p.email}`.toLowerCase().includes(search.toLowerCase()),
        );
      if (status)
        rows = rows.filter((p) => (p.account_status || "ACTIVE") === status);
      if (role) {
        const flags = await Promise.all(
          rows.map((p) => SupabaseRepo.hasRole(p.id, role)),
        );
        rows = rows.filter((_, i) => flags[i]);
      }
      total = rows.length;
      profiles = rows.slice(page * size, (page + 1) * size);
    } else {
      // Role filtering stays in SQL so pagination cannot omit matching accounts.
      let query = supabaseAdmin
        .from("profiles")
        .select(role ? "*,user_roles!inner(role,status)" : "*", {
          count: "exact",
        });
      if (role)
        query = query
          .eq("user_roles.role", role)
          .eq("user_roles.status", "ACTIVE");
      if (status) query = query.eq("account_status", status);
      if (search) {
        const safe = search.replace(/[,%_()\\]/g, " ").trim();
        if (safe)
          query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(page * size, (page + 1) * size - 1);
      if (error) throw new Error(error.message);
      profiles = data || [];
      total = count || 0;
    }
    const accounts = await Promise.all(
      profiles.map(async (p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        status: p.account_status || "ACTIVE",
        reason: p.suspension_reason || null,
        createdAt: p.created_at,
        roles: await SupabaseRepo.getUserRoles(p.id),
      })),
    );
    return { accounts, total, page, pageSize: size };
  },
  async details(id: string) {
    const profile = await SupabaseRepo.getProfile(id);
    if (!profile) throw new VenueError(404, "Account not found.");
    const [roles, player, captain, hub] = await Promise.all([
      SupabaseRepo.getUserRoles(id),
      SupabaseRepo.getPlayerProfile(id),
      SupabaseRepo.getCaptainProfile(id),
      SupabaseRepo.getHubOwnerProfile(id),
    ]);
    let history;
    if (allowsMemoryStores())
      history = memoryLog
        .filter((r) => r.target_id === id)
        .slice()
        .reverse();
    else {
      const { data, error } = await supabaseAdmin
        .from("account_moderation_log")
        .select("id,actor_id,action,reason,created_at")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      history = data || [];
    }
    return {
      account: {
        id,
        name: profile.name,
        email: profile.email,
        status: profile.account_status || "ACTIVE",
        reason: profile.suspension_reason || null,
        createdAt: profile.created_at,
        roles,
      },
      player,
      captain,
      hub,
      history,
    };
  },
  async moderate(
    actor: string,
    target: string,
    action: string,
    reason: string,
  ) {
    await this.assertAdmin(actor);
    if (
      !["SUSPENDED", "REINSTATED"].includes(action) ||
      typeof reason !== "string" ||
      reason.trim().length < 5 ||
      reason.length > 500
    )
      throw new VenueError(
        400,
        "Choose an action and enter a reason of 5–500 characters.",
      );
    if (!allowsMemoryStores()) {
      const { error } = await supabaseAdmin.rpc("moderate_account", {
        p_actor: actor,
        p_target: target,
        p_action: action,
        p_reason: reason.trim(),
      });
      if (error) databaseError(error);
      return;
    }
    const profile = await SupabaseRepo.getProfile(target);
    if (!profile) throw new VenueError(404, "Account not found.");
    if (target === actor || (await SupabaseRepo.hasRole(target, "ADMIN")))
      throw new VenueError(
        403,
        "Super-user accounts cannot be moderated here.",
      );
    const status = action === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    if ((profile.account_status || "ACTIVE") === status)
      throw new VenueError(409, "Account already has this status.");
    profile.account_status = status;
    profile.suspension_reason = status === "SUSPENDED" ? reason.trim() : null;
    profile.suspended_at =
      status === "SUSPENDED" ? new Date().toISOString() : null;
    memoryLog.push({
      target_id: target,
      actor_id: actor,
      action,
      reason: reason.trim(),
      created_at: new Date().toISOString(),
    });
  },
  async superuser(actor: string, target: string, grant: boolean) {
    await this.assertAdmin(actor);
    if (typeof grant !== "boolean")
      throw new VenueError(400, "Choose whether to grant or revoke access.");
    if (!allowsMemoryStores()) {
      const { error } = await supabaseAdmin.rpc("manage_superuser", {
        p_actor: actor,
        p_target: target,
        p_grant: grant,
      });
      if (error) databaseError(error);
      return;
    }
    const profile = await SupabaseRepo.getProfile(target);
    if (!profile || profile.account_status === "SUSPENDED")
      throw new VenueError(400, "An active existing account is required.");
    if (!grant && actor === target)
      throw new VenueError(
        403,
        "You cannot remove your own super-user access.",
      );
    if (grant) await SupabaseRepo.addRole(target, "ADMIN");
    else SupabaseRepo.revokeMemoryRole(target, "ADMIN");
    memoryLog.push({
      target_id: target,
      actor_id: actor,
      action: grant ? "GRANT_ADMIN" : "REVOKE_ADMIN",
      reason: "Super-user access changed",
      created_at: new Date().toISOString(),
    });
  },
};
