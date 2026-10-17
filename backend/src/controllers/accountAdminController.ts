import { AccountAdminRepo } from "../models/accountAdminRepo.js";
import { VenueError } from "../models/venueRepo.js";
import { venueHandler } from "./venueController.js";
import { Role } from "../models/supabaseRepo.js";
import { getSocketServer } from "../socket/socketServer.js";

function disconnect(userId: string) {
  for (const socket of getSocketServer()?.sockets.sockets.values() || []) {
    if (socket.data.userId === userId) socket.disconnect(true);
  }
}
export const AccountAdminController = {
  list: venueHandler(async (req) => {
    const { search = "", role, status, page = "0" } = req.query;
    if (
      typeof search !== "string" ||
      search.length > 100 ||
      (role &&
        !["PLAYER", "TEAM_CAPTAIN", "HUB_OWNER", "ADMIN"].includes(
          String(role),
        )) ||
      (status && !["ACTIVE", "SUSPENDED"].includes(String(status))) ||
      !/^\d{1,5}$/.test(String(page))
    )
      throw new VenueError(400, "Invalid account filters.");
    return AccountAdminRepo.list(
      search,
      role as Role | undefined,
      status as string | undefined,
      Number(page),
    );
  }),
  details: venueHandler((req) => AccountAdminRepo.details(req.params.id)),
  moderate: venueHandler(async (req) => {
    await AccountAdminRepo.moderate(
      req.auth!.userId,
      req.params.id,
      req.body.action,
      req.body.reason,
    );
    if (req.body.action === "SUSPENDED") disconnect(req.params.id);
    return { success: true };
  }),
  superuser: venueHandler(async (req) => {
    await AccountAdminRepo.superuser(
      req.auth!.userId,
      req.params.id,
      req.body.grant,
    );
    if (!req.body.grant) disconnect(req.params.id);
    return { success: true };
  }),
};
