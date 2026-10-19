import { api, ApiResponse } from "./api";
import { Venue, VenueInput, SpaceInput, SlotInput } from "../types/venue";
export function responseData<T>(response: ApiResponse<T>): T {
  if (response.error || !response.data)
    throw new Error(response.error || "No data returned. Please retry.");
  return response.data;
}
export const venueService = {
  async browse(sport = "", search = "", city = 'lahore', area = '', areaSearch = '') {
    return responseData(
      await api.get<{ hubs: Venue[] }>(
        `/api/hubs?${new URLSearchParams({ ...(sport ? { sport } : {}), search,city,area,areaSearch })}`,
      ),
    ).hubs;
  },
  async details(id: string) {
    return responseData(
      await api.get<{ hub: Venue }>(`/api/hubs/${encodeURIComponent(id)}`),
    ).hub;
  },
  async own() {
    return responseData(await api.get<{ hub: Venue }>("/api/hub/venue")).hub;
  },
  async saveVenue(input: VenueInput) {
    return responseData(await api.put<{ hub: Venue }>("/api/hub/venue", input))
      .hub;
  },
  async saveSpace(input: SpaceInput, id?: string) {
    return responseData(
      await api.request(`/api/hub/spaces${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: input,
      }),
    );
  },
  async deleteSpace(id: string) {
    return responseData(await api.delete(`/api/hub/spaces/${id}`));
  },
  async saveSlot(input: SlotInput, id?: string) {
    return responseData(
      await api.request(`/api/hub/slots${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: input,
      }),
    );
  },
  async deleteSlot(id: string) {
    return responseData(await api.delete(`/api/hub/slots/${id}`));
  },
  async uploadPhoto(base64: string) {
    return responseData(
      await api.post<{ url: string }>("/api/hub/photos", { base64 }),
    ).url;
  },
};
