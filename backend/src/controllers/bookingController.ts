import { Router, Request, Response } from "express";
import { BookingRepo, publicBooking } from "../models/bookingRepo.js";
import { VenueError, VenueRepo } from "../models/venueRepo.js";
import { venueHandler } from "./venueController.js";
import {
  authenticateSupabaseUser,
  authorizeRoles,
} from "../middleware/auth.js";
import {
  availableGateways,
  requireGateway,
  safepayCheckout,
  jazzcashWallet,
  acceptSafepayEvent,
  acceptJazzcashPayment,
} from "../payments/sandboxGateways.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { allowsMemoryStores } from "../config/runtime.js";

const checkoutLocks = new Set<string>();
export const BookingController = {
  gateways: venueHandler(async () => availableGateways()),
  mine: venueHandler((req) =>
    BookingRepo.list(req.auth!.userId, "customer").then((bookings) => ({
      bookings,
    })),
  ),
  owner: venueHandler((req) =>
    BookingRepo.list(req.auth!.userId, "owner").then((bookings) => ({
      bookings,
    })),
  ),
  refunds: venueHandler((req) =>
    BookingRepo.list(req.auth!.userId, "refunds").then((bookings) => ({
      bookings,
    })),
  ),
  details: venueHandler(async (req) => ({
    booking: publicBooking(
      await BookingRepo.accessible(req.auth!.userId, req.params.id),
    ),
  })),
  start: venueHandler(async (req) => {
    const { slotId, provider, choice, acceptTerms, slotVersion } =
      req.body || {};
    if (
      typeof slotVersion !== "string" ||
      slotVersion.length > 40 ||
      !Number.isFinite(Date.parse(slotVersion)) ||
      typeof slotId !== "string" ||
      !["safepay", "jazzcash"].includes(provider) ||
      !["FULL", "ADVANCE"].includes(choice) ||
      acceptTerms !== true
    )
      throw new VenueError(
        400,
        "Choose a payment method and accept the booking and cancellation terms.",
      );
    requireGateway(provider);
    return {
      booking: publicBooking(
        await BookingRepo.start(
          req.auth!.userId,
          slotId,
          provider,
          choice,
          slotVersion,
        ),
      ),
    };
  }, 201),
  checkout: venueHandler(async (req) => {
    const b = await BookingRepo.accessible(req.auth!.userId, req.params.id);
    if (b.customer_id !== req.auth!.userId)
      throw new VenueError(403, "Only the booking customer can pay.");
    if (
      b.status !== "PAYMENT_PENDING" ||
      Date.parse(b.hold_expires_at) <= Date.now()
    )
      throw new VenueError(409, "This checkout is no longer available.");
    requireGateway(b.provider);
    if (checkoutLocks.has(b.id))
      throw new VenueError(409, "Checkout is already opening.");
    checkoutLocks.add(b.id);
    try {
      return b.provider === "safepay"
        ? { url: await safepayCheckout(b), sandbox: true }
        : await jazzcashWallet(b, req.body.mobile, req.body.cnicSuffix);
    } catch (error) {
      if (error instanceof VenueError) throw error;
      throw new VenueError(
        502,
        "The sandbox gateway is unavailable. Your booking has not been confirmed.",
      );
    } finally {
      checkoutLocks.delete(b.id);
    }
  }),
  cancel: venueHandler(async (req) => ({
    booking: publicBooking(
      await BookingRepo.cancel(
        req.auth!.userId,
        req.params.id,
        req.body.reason,
      ),
    ),
  })),
  refundRecorded: venueHandler(async (req) => {
    const { reference } = req.body || {};
    if (
      typeof reference !== "string" ||
      reference.trim().length < 5 ||
      reference.length > 160
    )
      throw new VenueError(
        400,
        "Enter the completed gateway refund reference.",
      );
    if (allowsMemoryStores()) {
      const b = await BookingRepo.find(req.params.id);
      if (!b) throw new VenueError(404, "Booking not found.");
      if (b.refund_status !== "REFUNDED")
        await BookingRepo.settle(
          b.id,
          b.payment_reference!,
          b.provider,
          "manual-refund:" + reference,
          b.refund_due_minor - b.refunded_minor,
          "PKR",
          "REFUNDED",
        );
      return { success: true };
    }
    const { error } = await supabaseAdmin.rpc("record_venue_refund", {
      p_actor: req.auth!.userId,
      p_booking: req.params.id,
      p_reference: reference,
    });
    if (error) throw new VenueError(400, error.message);
    return { success: true };
  }),
  venueBalance: venueHandler(async (req) => {
    const b = await BookingRepo.accessible(req.auth!.userId, req.params.id);
    if (b.owner_id !== req.auth!.userId)
      throw new VenueError(403, "Owner access required.");
    if (allowsMemoryStores()) {
      if (b.status !== "CONFIRMED" || Date.parse(b.starts_at) > Date.now())
        throw new VenueError(
          409,
          "Record venue payment when the confirmed slot starts.",
        );
      b.venue_paid_minor = b.total_minor - b.paid_minor;
      return { success: true };
    }
    const { error } = await supabaseAdmin.rpc("record_venue_balance", {
      p_actor: req.auth!.userId,
      p_booking: req.params.id,
    });
    if (error) throw new VenueError(409, error.message);
    return { success: true };
  }),
  async safepayWebhook(req: Request, res: Response) {
    try {
      await acceptSafepayEvent(
        req.body as Buffer,
        req.get("x-sfpy-signature") || "",
      );
      res.json({ received: true });
    } catch (error) {
      res
        .status(error instanceof VenueError ? error.status : 500)
        .json({ error: "Payment notification was not accepted." });
    }
  },
  async jazzcashReturn(req: Request, res: Response) {
    try {
      await acceptJazzcashPayment(req.body);
      res.status(200).send(returnPage(req));
    } catch (error) {
      res
        .status(error instanceof VenueError ? error.status : 500)
        .send(
          "Payment could not be verified. Return to Maidaan and refresh your booking.",
        );
    }
  },
  returnPage(req: Request, res: Response) {
    res.setHeader("Cache-Control", "no-store");
    res.type("html").send(returnPage(req));
  },
};
function returnPage(req: Request) {
  let link = "";
  try {
    const app = new URL(process.env.PAYMENTS_APP_URL || "");
    if (
      ["http:", "https:"].includes(app.protocol) &&
      !app.username &&
      !app.password
    ) {
      const id = req.query.order_id || req.query.booking;
      const route =
        typeof id === "string" && /^[a-f\d-]{36}$/i.test(id)
          ? `/bookings/${id}`
          : "/bookings";
      const href = new URL(route, app.origin).href
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      link = `<p><a style="color:#E85D26" href="${href}">Open web bookings</a></p>`;
    }
  } catch {
    /* The native return instructions still work without a web URL. */
  }
  return `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to Maidaan</title><body style="background:#0C0D0E;color:#fff;font:16px system-ui;padding:32px"><h1>Return to Maidaan</h1><p>In Expo Go, close this browser page to return to the app, then refresh your booking status.</p>${link}<p>A payment is confirmed only after the gateway verifies it. A successful redirect does not confirm a reservation.</p><p>Sandbox mode: no real money is charged.</p></body></html>`;
}
export const bookingRoutes = Router();
bookingRoutes.use(authenticateSupabaseUser);
bookingRoutes.get("/gateways", BookingController.gateways);
bookingRoutes.get("/", BookingController.mine);
bookingRoutes.get(
  "/venue",
  authorizeRoles("HUB_OWNER"),
  BookingController.owner,
);
bookingRoutes.post(
  "/",
  authorizeRoles("PLAYER", "TEAM_CAPTAIN"),
  BookingController.start,
);
bookingRoutes.get("/:id", BookingController.details);
bookingRoutes.post("/:id/checkout", BookingController.checkout);
bookingRoutes.post("/:id/cancel", BookingController.cancel);
bookingRoutes.post(
  "/:id/venue-balance",
  authorizeRoles("HUB_OWNER"),
  BookingController.venueBalance,
);
