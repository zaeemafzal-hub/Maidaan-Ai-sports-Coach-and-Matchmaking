import { api } from "./api";
import { responseData } from "./venueService";
export interface ServiceCity {
  id: string;
  name: string;
  enabled: boolean;
  latitude: number;
  longitude: number;
  bounds: { south: number; north: number; west: number; east: number };
  areas: { id: string; name: string; aliases: string[] }[];
}
export const locationService = {
  async cities() {
    return responseData(
      await api.get<{ cities: ServiceCity[] }>("/api/locations"),
    ).cities;
  },
};
