import { isTest } from "../config/runtime.js";
import { SupabaseRepo } from "../models/supabaseRepo.js";

/** Shared REST/HITL domain operation. Repository RPCs own atomic mutations. */
export async function decideJoinRequest(
  requestId: string,
  captainId: string,
  action: "ACCEPT" | "REJECT",
): Promise<Awaited<ReturnType<typeof SupabaseRepo.acceptJoinRequest>>> {
  const result =
    action === "ACCEPT"
      ? await SupabaseRepo.acceptJoinRequest(requestId, captainId)
      : await SupabaseRepo.rejectJoinRequest(requestId, captainId);
  // Live RPCs write notifications in the same transaction. Mirror this in the isolated test repository.
  if (result.success && result.request && isTest()) {
    const match = await SupabaseRepo.getMatchById(result.request.matchId);
    await SupabaseRepo.createNotification({
      userId: result.request.playerId,
      type:
        action === "ACCEPT" ? "JOIN_REQUEST_ACCEPTED" : "JOIN_REQUEST_REJECTED",
      title: action === "ACCEPT" ? "SPOT CONFIRMED" : "REQUEST UPDATE",
      message:
        action === "ACCEPT"
          ? `Your slot for ${match?.title} has been confirmed. You are in the lineup!`
          : `Your request for ${match?.title} was not accepted.`,
      matchId: result.request.matchId,
      joinRequestId: requestId,
    });
  }
  return result;
}
