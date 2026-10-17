import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";
import { allowsMemoryStores } from "../config/runtime.js";
import { SupabaseRepo, Sport, CourtStatus } from "./supabaseRepo.js";
import { BookingRepo } from "./bookingRepo.js";
import { SlotPaymentPolicy } from "../utils/bookingPolicy.js";

export class VenueError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface SpaceDetails {
  areaName: string;
  playFormat: string;
  surface: string;
  isIndoor: boolean;
  playerCapacity: number | null;
  photoUrls: string[];
}
export interface VenueDetails {
  latitude: number | null;
  longitude: number | null;
  description: string;
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
  paymentPolicy: SlotPaymentPolicy;
  advancePercent: number;
  cancelBeforeHours: number;
  cancellationRefund: "FULL" | "KEEP_ADVANCE";
}
export const defaultSlotPolicy = {
  bookingEnabled: false,
  paymentPolicy: "FULL_ONLY" as const,
  advancePercent: 25,
  cancelBeforeHours: 24,
  cancellationRefund: "FULL" as const,
};
const memoryDetails = new Map<string, SpaceDetails>();
const memoryVenues = new Map<string, VenueDetails>();
const memorySlots = new Map<string, VenueSlot>();
const blankSpace: SpaceDetails = {
  areaName: "",
  playFormat: "",
  surface: "",
  isIndoor: false,
  playerCapacity: null,
  photoUrls: [],
};
const blankVenue: VenueDetails = {
  latitude: null,
  longitude: null,
  description: "",
  photoUrls: [],
};
function dbError(error: { code?: string; message?: string }): never {
  if (error.code === "23505")
    throw new VenueError(
      409,
      error.message || "An active booking prevents this change.",
    );
  if (["23503", "23001"].includes(error.code || ""))
    throw new VenueError(
      409,
      "This item has booking history. Mark it unavailable instead of deleting it.",
    );
  if (error.code === "23P01")
    throw new VenueError(
      409,
      "This playing space already has an available slot overlapping that time.",
    );
  throw new Error(error.message || "Venue data request failed.");
}
function spaceFields(details: SpaceDetails) {
  return {
    area_name: details.areaName,
    play_format: details.playFormat,
    surface: details.surface,
    is_indoor: details.isIndoor,
    player_capacity: details.playerCapacity,
    photo_urls: details.photoUrls,
  };
}
function fromSpace(row: any) {
  return {
    id: row.id,
    hubOwnerId: row.hub_owner_id,
    name: row.name,
    sport: row.sport as Sport,
    status: row.status as CourtStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    areaName: row.area_name || "",
    playFormat: row.play_format || "",
    surface: row.surface || "",
    isIndoor: Boolean(row.is_indoor),
    playerCapacity: row.player_capacity ?? null,
    photoUrls: row.photo_urls || [],
  };
}
function fromSlot(row: any): VenueSlot {
  return {
    id: row.id,
    courtId: row.court_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    price: Number(row.price),
    status: row.status,
    updatedAt: row.updated_at,
    bookingEnabled: Boolean(row.booking_enabled),
    paymentPolicy: row.payment_policy || "FULL_ONLY",
    advancePercent: row.advance_percent ?? 25,
    cancelBeforeHours: row.cancel_before_hours ?? 24,
    cancellationRefund: row.cancellation_refund || "FULL",
  };
}
export const VenueRepo = {
  async slotById(id: string): Promise<VenueSlot | null> {
    if (allowsMemoryStores()) return memorySlots.get(id) || null;
    const { data, error } = await supabaseAdmin
      .from("hub_slots")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) dbError(error);
    return data ? fromSlot(data) : null;
  },
  async spaces(ownerId: string) {
    if (allowsMemoryStores()) {
      return (await SupabaseRepo.getHubCourtsByOwner(ownerId)).map((court) => ({
        ...court,
        ...(memoryDetails.get(court.id) || blankSpace),
      }));
    }
    const { data, error } = await supabaseAdmin
      .from("hub_courts")
      .select("*")
      .eq("hub_owner_id", ownerId)
      .order("created_at");
    if (error) dbError(error);
    return (data || []).map(fromSpace);
  },
  async saveSpace(
    ownerId: string,
    input: { name: string; sport: Sport; status: CourtStatus } & SpaceDetails,
    id?: string,
  ) {
    if (!(await SupabaseRepo.getHubOwnerProfile(ownerId)))
      throw new VenueError(400, "Complete your venue profile first.");
    if (id) {
      const existing = await SupabaseRepo.getHubCourtById(id);
      if (!existing || existing.hubOwnerId !== ownerId)
        throw new VenueError(404, "Playing space not found.");
      if (!allowsMemoryStores()) {
        const { data, error } = await supabaseAdmin
          .from("hub_courts")
          .update({
            name: input.name,
            sport: input.sport,
            status: input.status,
            ...spaceFields(input),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("hub_owner_id", ownerId)
          .select()
          .single();
        if (error) dbError(error);
        return fromSpace(data);
      }
      const court = await SupabaseRepo.updateHubCourt(id, input);
      memoryDetails.set(id, input);
      return { ...court, ...input };
    }
    if (await SupabaseRepo.getHubCourtByOwnerAndName(ownerId, input.name))
      throw new VenueError(
        409,
        "A playing space with this name already exists.",
      );
    const created = await SupabaseRepo.createHubCourt({
      hubOwnerId: ownerId,
      ...input,
    });
    if (allowsMemoryStores()) {
      memoryDetails.set(created.id, input);
      return { ...created, ...input };
    }
    const { data, error } = await supabaseAdmin
      .from("hub_courts")
      .update(spaceFields(input))
      .eq("id", created.id)
      .eq("hub_owner_id", ownerId)
      .select()
      .single();
    if (error) {
      await SupabaseRepo.deleteHubCourt(created.id, ownerId);
      dbError(error);
    }
    return fromSpace(data);
  },
  async deleteSpace(ownerId: string, id: string) {
    const court = await SupabaseRepo.getHubCourtById(id);
    if (!court || court.hubOwnerId !== ownerId)
      throw new VenueError(404, "Playing space not found.");
    const slotIds = (await this.slots(ownerId))
      .filter((slot) => slot.courtId === id)
      .map((slot) => slot.id);
    if (await BookingRepo.hasSlotHistory(slotIds))
      throw new VenueError(
        409,
        "This playing space has booking history. Mark it unavailable instead of deleting it.",
      );
    await SupabaseRepo.deleteHubCourt(id, ownerId);
    memoryDetails.delete(id);
    for (const [key, slot] of memorySlots)
      if (slot.courtId === id) memorySlots.delete(key);
  },
  async details(ownerId: string) {
    const profile = await SupabaseRepo.getHubOwnerProfile(ownerId);
    if (!profile) throw new VenueError(404, "Venue not found.");
    if (allowsMemoryStores())
      return { ...profile, ...(memoryVenues.get(ownerId) || blankVenue) };
    const row = profile as typeof profile & {
      latitude?: number;
      longitude?: number;
      description?: string;
      photo_urls?: string[];
    };
    return {
      ...profile,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      description: row.description || "",
      photoUrls: row.photo_urls || [],
    };
  },
  async saveDetails(
    ownerId: string,
    input: VenueDetails & {
      hubName: string;
      location: string;
      contactNumber: string;
      sports: Sport[];
    },
  ) {
    if (allowsMemoryStores()) {
      await SupabaseRepo.updateHubOwnerProfile(ownerId, input);
      memoryVenues.set(ownerId, input);
    } else {
      const { error } = await supabaseAdmin
        .from("hub_owner_profiles")
        .update({
          hub_name: input.hubName,
          location: input.location,
          contact_number: input.contactNumber,
          sports: input.sports,
          latitude: input.latitude,
          longitude: input.longitude,
          description: input.description,
          photo_urls: input.photoUrls,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", ownerId)
        .select("user_id")
        .single();
      if (error) dbError(error);
    }
    return this.details(ownerId);
  },
  async slots(ownerId: string, publishedOnly = false) {
    const courts = await this.spaces(ownerId);
    const ids = courts
      .filter((c) => !publishedOnly || c.status !== "UNAVAILABLE")
      .map((c) => c.id);
    if (!ids.length) return [];
    let rows: VenueSlot[];
    if (allowsMemoryStores())
      rows = [...memorySlots.values()].filter((s) => ids.includes(s.courtId));
    else {
      let query = supabaseAdmin
        .from("hub_slots")
        .select("*")
        .in("court_id", ids)
        .order("starts_at");
      if (publishedOnly)
        query = query
          .eq("status", "AVAILABLE")
          .gt("starts_at", new Date().toISOString());
      const { data, error } = await query;
      if (error) dbError(error);
      rows = (data || []).map(fromSlot);
    }
    if (publishedOnly)
      rows = rows.filter(
        (s) => s.status === "AVAILABLE" && Date.parse(s.startsAt) > Date.now(),
      );
    if (publishedOnly && rows.some((row) => row.bookingEnabled)) {
      const busy = await BookingRepo.activeSlotIds(
        rows.filter((row) => row.bookingEnabled).map((row) => row.id),
      );
      rows = rows.filter((row) => !busy.has(row.id));
    }
    return rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
  async saveSlot(ownerId: string, input: Omit<VenueSlot, "id">, id?: string) {
    const court = await SupabaseRepo.getHubCourtById(input.courtId);
    if (!court || court.hubOwnerId !== ownerId)
      throw new VenueError(404, "Playing space not found.");
    if (allowsMemoryStores()) {
      if (id && (await BookingRepo.activeSlotIds([id])).has(id))
        throw new VenueError(
          409,
          "Cancel the active booking before editing this slot.",
        );
      if (id && memorySlots.get(id)?.courtId !== input.courtId)
        throw new VenueError(404, "Slot not found.");
      if (
        input.status === "AVAILABLE" &&
        [...memorySlots.values()].some(
          (s) =>
            s.id !== id &&
            s.courtId === input.courtId &&
            s.status === "AVAILABLE" &&
            s.startsAt < input.endsAt &&
            input.startsAt < s.endsAt,
        )
      ) {
        throw new VenueError(
          409,
          "This playing space already has an available slot overlapping that time.",
        );
      }
      const saved = {
        ...input,
        id: id || crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      memorySlots.set(saved.id, saved);
      return saved;
    }
    const payload = {
      court_id: input.courtId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      price: input.price,
      status: input.status,
      updated_at: new Date().toISOString(),
      booking_enabled: input.bookingEnabled,
      payment_policy: input.paymentPolicy,
      advance_percent: input.advancePercent,
      cancel_before_hours: input.cancelBeforeHours,
      cancellation_refund: input.cancellationRefund,
    };
    const query = id
      ? supabaseAdmin
          .from("hub_slots")
          .update(payload)
          .eq("id", id)
          .eq("court_id", input.courtId)
      : supabaseAdmin.from("hub_slots").insert(payload);
    const { data, error } = await query.select().single();
    if (error) dbError(error);
    return fromSlot(data);
  },
  async deleteSlot(ownerId: string, id: string) {
    if (await BookingRepo.hasSlotHistory([id]))
      throw new VenueError(
        409,
        "This slot has booking history. Mark it unavailable instead of deleting it.",
      );
    if ((await BookingRepo.activeSlotIds([id])).has(id))
      throw new VenueError(
        409,
        "Cancel the active booking before removing this slot.",
      );
    const slots = await this.slots(ownerId);
    if (!slots.some((s) => s.id === id))
      throw new VenueError(404, "Slot not found.");
    if (allowsMemoryStores()) memorySlots.delete(id);
    else {
      const { error } = await supabaseAdmin
        .from("hub_slots")
        .delete()
        .eq("id", id);
      if (error) dbError(error);
    }
  },
  async publicDetails(ownerId: string) {
    const owner = await SupabaseRepo.getProfile(ownerId);
    if (
      !owner ||
      owner.account_status === "SUSPENDED" ||
      !(await SupabaseRepo.hasRole(ownerId, "HUB_OWNER"))
    )
      throw new VenueError(404, "Venue not found.");
    const [hub, spaces, slots] = await Promise.all([
      this.details(ownerId),
      this.spaces(ownerId),
      this.slots(ownerId, true),
    ]);
    return {
      id: ownerId,
      name: hub.hub_name,
      location: hub.location,
      contactNumber: hub.contact_number || "",
      sports: hub.sports,
      isVerified: hub.is_verified,
      latitude: hub.latitude,
      longitude: hub.longitude,
      description: hub.description,
      photoUrls: hub.photoUrls,
      spaces: spaces.filter((s) => s.status !== "UNAVAILABLE"),
      slots,
    };
  },
  async publicHubs(sport?: Sport, search = "") {
    const hubs = await SupabaseRepo.getHubs();
    const results = await Promise.all(
      hubs.map(async (hub) => {
        try {
          return await this.publicDetails(hub.user_id);
        } catch (error) {
          if (error instanceof VenueError && error.status === 404) return null;
          throw error;
        }
      }),
    );
    const term = search.toLowerCase();
    return results
      .filter((hub): hub is NonNullable<typeof hub> => Boolean(hub))
      .filter(
        (hub) =>
          !sport ||
          hub.sports.includes(sport) ||
          hub.spaces.some((space) => space.sport === sport),
      )
      .filter(
        (hub) =>
          !term || (hub.name + " " + hub.location).toLowerCase().includes(term),
      );
  },
};
