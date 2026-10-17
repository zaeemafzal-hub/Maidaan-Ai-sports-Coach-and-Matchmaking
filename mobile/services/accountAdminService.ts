import { api } from "./api";
import { responseData } from "./venueService";
import { Role } from "../types";
export interface ManagedAccount {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  reason: string | null;
  createdAt: string;
  roles: Role[];
}
export interface AccountDetails {
  account: ManagedAccount;
  player: Record<string, unknown> | null;
  captain: Record<string, unknown> | null;
  hub: Record<string, unknown> | null;
  history: {
    id?: string;
    action: string;
    reason: string;
    actor_id: string;
    created_at: string;
  }[];
}
export const accountAdminService = {
  async list(search: string, role: string, status: string, page: number) {
    return responseData(
      await api.get<{
        accounts: ManagedAccount[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        `/api/admin/accounts?${new URLSearchParams({ search, ...(role === "ALL" ? {} : { role }), ...(status === "ALL" ? {} : { status }), page: String(page) })}`,
      ),
    );
  },
  async details(id: string) {
    return responseData(
      await api.get<AccountDetails>(`/api/admin/accounts/${id}`),
    );
  },
  async moderate(
    id: string,
    action: "SUSPENDED" | "REINSTATED",
    reason: string,
  ) {
    return responseData(
      await api.patch(`/api/admin/accounts/${id}/status`, { action, reason }),
    );
  },
  async superuser(id: string, grant: boolean) {
    return responseData(
      await api.patch(`/api/admin/accounts/${id}/superuser`, { grant }),
    );
  },
};
