import { supabaseAdmin } from "../lib/supabase.js";
import { allowsMemoryStores } from "../config/runtime.js";
import { VenueError, VenueRepo } from "./venueRepo.js";
import { SupabaseRepo } from "./supabaseRepo.js";
import { bookingQuote, cancellationDeadline } from "../utils/bookingPolicy.js";
import crypto from "node:crypto";

export interface Booking {
  id: string;
  slot_id: string;
  customer_id: string;
  owner_id: string;
  venue_name: string;
  space_name: string;
  location: string;
  starts_at: string;
  ends_at: string;
  status: "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  provider: "safepay" | "jazzcash";
  payment_reference: string | null;
  payment_choice: "FULL" | "ADVANCE";
  currency: "PKR";
  total_minor: number;
  advance_minor: number;
  upfront_minor: number;
  paid_minor: number;
  venue_paid_minor: number;
  cancel_before_hours: number;
  cancellation_refund: "FULL" | "KEEP_ADVANCE";
  cancel_deadline: string;
  hold_expires_at: string;
  checkout_nonce: string;
  refund_due_minor: number;
  refunded_minor: number;
  refund_status: "NONE" | "PENDING" | "REFUNDED";
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}
const memory = new Map<string, Booking>(),
  events = new Set<string>();
// Test transactions are serialized; production uses PostgreSQL row locks and indexes.
let memoryQueue: Promise<unknown> = Promise.resolve();
function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const result = memoryQueue.then(fn, fn);
  memoryQueue = result.catch(() => {});
  return result;
}
function check(error: any): never {
  throw new VenueError(
    error.code === "42501"
      ? 403
      : error.code === "P0002"
        ? 404
        : ["23505", "23503", "23001"].includes(error.code)
          ? 409
          : error.code === "22023"
            ? 400
            : 500,
    ["23503", "23001"].includes(error.code)
      ? "This item has booking history. Mark it unavailable instead of deleting it."
      : error.message,
  );
}
function expire(b: Booking) {
  if (
    b.status === "PAYMENT_PENDING" &&
    Date.parse(b.hold_expires_at) <= Date.now()
  )
    b.status = "EXPIRED";
  return b;
}
export function publicBooking(b: Booking) {
  const { checkout_nonce, ...visible } = b;
  return {
    ...visible,
    // Normalize the separator saved by the first booking migration export.
    space_name: visible.space_name.replaceAll("Ãƒâ€šÃ‚Â·", "/"),
    balance_minor: Math.max(
      0,
      b.total_minor - b.paid_minor - b.venue_paid_minor,
    ),
  };
}
export const BookingRepo = {
  async hasSlotHistory(ids: string[]): Promise<boolean> {
    if (!ids.length) return false;
    if (allowsMemoryStores())
      return [...memory.values()].some((b) => ids.includes(b.slot_id));
    const { data, error } = await supabaseAdmin
      .from("venue_bookings")
      .select("id")
      .in("slot_id", ids)
      .limit(1);
    if (error) check(error);
    return Boolean(data?.length);
  },
  async activeSlotIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    if (allowsMemoryStores())
      return new Set(
        [...memory.values()]
          .map(expire)
          .filter(
            (b) =>
              ids.includes(b.slot_id) &&
              ["PAYMENT_PENDING", "CONFIRMED"].includes(b.status),
          )
          .map((b) => b.slot_id),
      );
    const { data, error } = await supabaseAdmin
      .from("venue_bookings")
      .select("slot_id,status,hold_expires_at")
      .in("slot_id", ids)
      .in("status", ["PAYMENT_PENDING", "CONFIRMED"]);
    if (error) check(error);
    return new Set(
      (data || [])
        .filter(
          (b) =>
            b.status === "CONFIRMED" ||
            Date.parse(b.hold_expires_at) > Date.now(),
        )
        .map((b) => b.slot_id),
    );
  },
  async find(id: string): Promise<Booking | null> {
    if (allowsMemoryStores())
      return memory.has(id) ? expire(memory.get(id)!) : null;
    const { data, error } = await supabaseAdmin
      .from("venue_bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) check(error);
    return data ? expire(data as Booking) : null;
  },
  async byReference(
    provider: string,
    reference: string,
  ): Promise<Booking | null> {
    if (allowsMemoryStores())
      return (
        [...memory.values()].find(
          (b) => b.provider === provider && b.payment_reference === reference,
        ) || null
      );
    const { data, error } = await supabaseAdmin
      .from("venue_bookings")
      .select("*")
      .eq("provider", provider)
      .eq("payment_reference", reference)
      .maybeSingle();
    if (error) check(error);
    return data;
  },
  async accessible(actor: string, id: string) {
    const b = await this.find(id);
    if (
      !b ||
      (![b.customer_id, b.owner_id].includes(actor) &&
        !(await SupabaseRepo.hasRole(actor, "ADMIN")))
    )
      throw new VenueError(404, "Booking not found.");
    return b;
  },
  async list(actor: string, scope: "customer" | "owner" | "refunds") {
    let rows: Booking[];
    if (allowsMemoryStores())
      rows = [...memory.values()]
        .map(expire)
        .filter((b) =>
          scope === "refunds"
            ? b.refund_status === "PENDING"
            : scope === "owner"
              ? b.owner_id === actor
              : b.customer_id === actor,
        );
    else {
      let q = supabaseAdmin
        .from("venue_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      q =
        scope === "refunds"
          ? q.eq("refund_status", "PENDING")
          : q.eq(scope === "owner" ? "owner_id" : "customer_id", actor);
      const { data, error } = await q;
      if (error) check(error);
      rows = (data || []).map((b) => expire(b as Booking));
    }
    return rows.map(publicBooking);
  },
  async start(
    customer: string,
    slotId: string,
    provider: Booking["provider"],
    choice: Booking["payment_choice"],
    version?: string,
  ): Promise<Booking> {
    if (!allowsMemoryStores()) {
      const { data, error } = await supabaseAdmin.rpc("start_venue_booking", {
        p_customer: customer,
        p_slot: slotId,
        p_provider: provider,
        p_choice: choice,
        p_version: version || null,
      });
      if (error) check(error);
      return data as Booking;
    }
    return transaction(async () => {
      const customerProfile = await SupabaseRepo.getProfile(customer);
      if (
        !customerProfile ||
        customerProfile.account_status === "SUSPENDED" ||
        !(await SupabaseRepo.getUserRoles(customer)).some((r) =>
          ["PLAYER", "TEAM_CAPTAIN"].includes(r),
        )
      )
        throw new VenueError(403, "Player or captain access required.");
      const slot = await VenueRepo.slotById(slotId);
      if (!slot) throw new VenueError(404, "Slot not found.");
      if (version && Date.parse(version) !== Date.parse(slot.updatedAt || ""))
        throw new VenueError(
          409,
          "Slot terms changed. Review the latest price and cancellation terms.",
        );
      const court = await SupabaseRepo.getHubCourtById(slot.courtId);
      if (!court) throw new VenueError(404, "Playing space not found.");
      if (court.hubOwnerId === customer)
        throw new VenueError(400, "You cannot book your own venue.");
      const hub = await VenueRepo.publicDetails(court.hubOwnerId);
      if (
        !slot.bookingEnabled ||
        slot.status !== "AVAILABLE" ||
        court.status === "UNAVAILABLE" ||
        Date.parse(slot.startsAt) <= Date.now()
      )
        throw new VenueError(409, "This slot is not open for booking.");
      const current = [...memory.values()]
        .map(expire)
        .find(
          (b) =>
            b.slot_id === slotId &&
            ["PAYMENT_PENDING", "CONFIRMED"].includes(b.status),
        );
      if (current) {
        if (
          current.customer_id === customer &&
          current.status === "PAYMENT_PENDING" &&
          current.provider === provider &&
          current.payment_choice === choice
        )
          return current;
        throw new VenueError(
          409,
          "This slot is already booked or temporarily held.",
        );
      }
      const quote = bookingQuote({
        price: slot.price,
        paymentPolicy: slot.paymentPolicy,
        advancePercent: slot.advancePercent,
        choice,
      });
      const now = new Date().toISOString();
      const b: Booking = {
        id: crypto.randomUUID(),
        slot_id: slot.id,
        customer_id: customer,
        owner_id: court.hubOwnerId,
        venue_name: hub.name,
        space_name: court.name,
        location: hub.location,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        status: "PAYMENT_PENDING",
        provider,
        payment_reference: null,
        payment_choice: choice,
        currency: "PKR",
        total_minor: quote.totalMinor,
        advance_minor: quote.advanceMinor,
        upfront_minor: quote.upfrontMinor,
        paid_minor: 0,
        venue_paid_minor: 0,
        cancel_before_hours: slot.cancelBeforeHours,
        cancellation_refund: slot.cancellationRefund,
        cancel_deadline: cancellationDeadline(
          slot.startsAt,
          slot.cancelBeforeHours,
        ),
        hold_expires_at: new Date(
          Math.min(Date.now() + 900000, Date.parse(slot.startsAt)),
        ).toISOString(),
        checkout_nonce: crypto.randomBytes(24).toString("hex"),
        refund_due_minor: 0,
        refunded_minor: 0,
        refund_status: "NONE",
        created_at: now,
        updated_at: now,
      };
      memory.set(b.id, b);
      return b;
    });
  },
  async attachReference(id: string, reference: string): Promise<string> {
    // A single reference is allocated per hold; retries never create two payable sessions.
    if (allowsMemoryStores()) {
      const b = memory.get(id)!;
      b.payment_reference ||= reference;
      return b.payment_reference;
    }
    const { error } = await supabaseAdmin
      .from("venue_bookings")
      .update({ payment_reference: reference })
      .eq("id", id)
      .is("payment_reference", null);
    if (error) check(error);
    return (await this.find(id))!.payment_reference!;
  },
  async settle(
    id: string,
    reference: string,
    provider: string,
    event: string,
    amount: number,
    currency: string,
    kind: "PAID" | "REFUNDED",
  ) {
    if (!allowsMemoryStores()) {
      const { data, error } = await supabaseAdmin.rpc("settle_venue_booking", {
        p_booking: id,
        p_reference: reference,
        p_provider: provider,
        p_event: event,
        p_amount: amount,
        p_currency: currency,
        p_kind: kind,
      });
      if (error) check(error);
      return data as Booking;
    }
    return transaction(async () => {
      const b = memory.get(id);
      if (!b) throw new VenueError(404, "Booking not found.");
      if (
        b.payment_reference !== reference ||
        b.provider !== provider ||
        currency !== "PKR"
      )
        throw new VenueError(400, "Payment reference mismatch.");
      const key = provider + ":" + event;
      if (events.has(key)) return b;
      if (kind === "PAID") {
        if (amount !== b.upfront_minor)
          throw new VenueError(400, "Payment amount mismatch.");
        if (!b.paid_minor) {
          const owner = await SupabaseRepo.getProfile(b.owner_id),
            customer = await SupabaseRepo.getProfile(b.customer_id);
          const active =
            b.status === "PAYMENT_PENDING" &&
            Date.parse(b.hold_expires_at) > Date.now() &&
            Date.parse(b.starts_at) > Date.now() &&
            owner?.account_status !== "SUSPENDED" &&
            customer?.account_status !== "SUSPENDED";
          b.paid_minor = amount;
          if (active) b.status = "CONFIRMED";
          else {
            if (b.status !== "CANCELLED") b.status = "EXPIRED";
            b.refund_due_minor = amount;
            b.refund_status = "PENDING";
          }
        }
      } else {
        if (amount <= 0 || b.refunded_minor + amount > b.refund_due_minor)
          throw new VenueError(400, "Refund requires review.");
        b.refunded_minor += amount;
        b.refund_status =
          b.refunded_minor === b.refund_due_minor ? "REFUNDED" : "PENDING";
      }
      events.add(key);
      return b;
    });
  },
  async cancel(actor: string, id: string, reason: string) {
    if (
      typeof reason !== "string" ||
      reason.trim().length < 5 ||
      reason.length > 300
    )
      throw new VenueError(
        400,
        "Enter a cancellation reason of 5-300 characters.",
      );
    if (!allowsMemoryStores()) {
      const { data, error } = await supabaseAdmin.rpc("cancel_venue_booking", {
        p_actor: actor,
        p_booking: id,
        p_reason: reason.trim(),
      });
      if (error) check(error);
      return data as Booking;
    }
    return transaction(async () => {
      const b = await this.accessible(actor, id);
      if (![b.owner_id, b.customer_id].includes(actor))
        throw new VenueError(
          403,
          "Only the customer or venue owner can cancel.",
        );
      if (b.status === "CANCELLED") return b;
      if (
        Date.parse(b.starts_at) <= Date.now() ||
        !["PAYMENT_PENDING", "CONFIRMED"].includes(b.status)
      )
        throw new VenueError(409, "Booking is no longer cancellable.");
      b.refund_due_minor =
        actor === b.owner_id
          ? b.paid_minor
          : Date.now() > Date.parse(b.cancel_deadline)
            ? 0
            : b.cancellation_refund === "FULL"
              ? b.paid_minor
              : Math.max(0, b.paid_minor - b.advance_minor);
      b.refund_status = b.refund_due_minor ? "PENDING" : "NONE";
      b.status = "CANCELLED";
      b.cancellation_reason = reason.trim();
      b.cancelled_at = new Date().toISOString();
      return b;
    });
  },
};
