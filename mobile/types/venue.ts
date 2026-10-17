import { Sport, CourtStatus } from "./index";
export const SPORTS: Sport[] = ["cricket", "football", "padel", "badminton"];
export const FORMATS: Record<Sport, string[]> = {
  cricket: ["Net practice", "Tape-ball", "Hard-ball", "Indoor cricket"],
  football: ["5-a-side", "7-a-side", "11-a-side", "Futsal"],
  padel: ["Singles", "Doubles"],
  badminton: ["Singles", "Doubles"],
};
export interface PlayingSpace {
  id: string;
  name: string;
  sport: Sport;
  status: CourtStatus;
  areaName: string;
  playFormat: string;
  surface: string;
  isIndoor: boolean;
  playerCapacity: number | null;
  photoUrls: string[];
}
export interface VenueSlot {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  price: number;
  status: "AVAILABLE" | "UNAVAILABLE";
  updatedAt?: string;
  bookingEnabled: boolean;
  paymentPolicy: "FULL_ONLY" | "FULL_OR_ADVANCE";
  advancePercent: number;
  cancelBeforeHours: number;
  cancellationRefund: "FULL" | "KEEP_ADVANCE";
}
export interface Venue {
  id: string;
  name: string;
  location: string;
  contactNumber: string;
  sports: Sport[];
  isVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  description: string;
  photoUrls: string[];
  spaces: PlayingSpace[];
  slots: VenueSlot[];
}
export type VenueInput = Omit<Venue, "id" | "isVerified" | "spaces" | "slots">;
export type SpaceInput = Omit<PlayingSpace, "id">;
export interface SlotInput {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  bookingEnabled: boolean;
  paymentPolicy: "FULL_ONLY" | "FULL_OR_ADVANCE";
  advancePercent: number;
  cancelBeforeHours: number;
  cancellationRefund: "FULL" | "KEEP_ADVANCE";
}
export function slotLabel(slot: VenueSlot) {
  const options = { timeZone: "Asia/Karachi" };
  return `${new Date(slot.startsAt).toLocaleDateString("en-GB", options)} · ${new Date(slot.startsAt).toLocaleTimeString("en-GB", { ...options, hour: "2-digit", minute: "2-digit" })}–${new Date(slot.endsAt).toLocaleTimeString("en-GB", { ...options, hour: "2-digit", minute: "2-digit" })}`;
}
