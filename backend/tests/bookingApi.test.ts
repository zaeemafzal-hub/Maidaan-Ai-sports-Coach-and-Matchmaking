import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import app from "../src/app.js";
import { SupabaseRepo } from "../src/models/supabaseRepo.js";
import { VenueRepo } from "../src/models/venueRepo.js";
import { BookingRepo } from "../src/models/bookingRepo.js";
import {
  jazzcashHash,
  validJazzcashSignature,
  availableGateways,
} from "../src/payments/sandboxGateways.js";
process.env.NODE_ENV = "test";

test("booking HTTP authorization and signed payment events", async (t) => {
  process.env.SAFEPAY_PUBLIC_KEY = "test-public";
  process.env.SAFEPAY_SECRET_KEY = "test-secret";
  process.env.SAFEPAY_WEBHOOK_SECRET = "test-signature-key";
  process.env.PAYMENTS_PUBLIC_URL = "https://payments.example.com";
  process.env.JAZZCASH_MERCHANT_ID = "test-merchant";
  process.env.JAZZCASH_PASSWORD = "test-password";
  process.env.JAZZCASH_INTEGRITY_SALT = "test-integrity";
  process.env.JAZZCASH_WALLET_URL =
    "https://sandbox.jazzcash.com.pk/test-wallet";
  const owner = "00000000-0000-0000-0000-000000007001",
    player = "00000000-0000-0000-0000-000000007002",
    other = "00000000-0000-0000-0000-000000007003",
    admin = "00000000-0000-0000-0000-000000007004";
  for (const [id, role] of [
    [owner, "HUB_OWNER"],
    [player, "PLAYER"],
    [other, "PLAYER"],
    [admin, "ADMIN"],
  ] as const)
    await SupabaseRepo.createProfile({
      id,
      role,
      name: role,
      email: id + "@example.com",
    });
  await SupabaseRepo.upsertHubOwnerProfile({
    userId: owner,
    hubName: "Booking Tests",
    location: "Lahore",
    sports: ["cricket"],
    courtCount: 0,
  });
  const court = await VenueRepo.saveSpace(owner, {
    name: "Pitch",
    sport: "cricket",
    status: "AVAILABLE",
    areaName: "Ground",
    playFormat: "Tape-ball",
    surface: "Turf",
    isIndoor: false,
    playerCapacity: 12,
    photoUrls: [],
  });
  let offset = 0;
  async function slot() {
    const startsAt = new Date(
      Date.now() + (72 + offset++ * 3) * 3600000,
    ).toISOString();
    return VenueRepo.saveSlot(owner, {
      courtId: court.id,
      startsAt,
      endsAt: new Date(Date.parse(startsAt) + 7200000).toISOString(),
      price: 2000,
      status: "AVAILABLE",
      bookingEnabled: true,
      paymentPolicy: "FULL_OR_ADVANCE",
      advancePercent: 25,
      cancelBeforeHours: 24,
      cancellationRefund: "KEEP_ADVANCE",
    });
  }
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  async function request(
    user: string,
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const res = await fetch(
      `http://127.0.0.1:${(server.address() as any).port}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? { Authorization: `Bearer test_token:${user}:test%40example.com` }
            : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    const raw = await res.text();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    return { status: res.status, body: parsed };
  }
  async function webhook(
    b: any,
    changes: Record<string, unknown> = {},
    signature = true,
  ) {
    const body = {
      token: "evt_" + crypto.randomUUID(),
      type: "payment.succeeded",
      merchant_api_key: "test-public",
      data: {
        tracker: b.payment_reference,
        state: "TRACKER_ENDED",
        amount: b.upfront_minor,
        currency: "PKR",
        ...changes,
      },
    };
    return request("", "/api/payments/safepay/webhook", "POST", body, {
      "x-sfpy-signature": signature
        ? crypto
            .createHmac("sha512", "test-signature-key")
            .update(JSON.stringify(body))
            .digest("hex")
        : "0".repeat(128),
    });
  }
  try {
    await t.test(
      "requires authentication, terms acceptance and fresh slot version",
      async () => {
        const s = await slot();
        assert.equal((await request("", "/api/bookings")).status, 401);
        assert.equal(
          (
            await request(player, "/api/bookings", "POST", {
              slotId: s.id,
              provider: "safepay",
              choice: "FULL",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(player, "/api/bookings", "POST", {
              slotId: s.id,
              provider: "safepay",
              choice: "FULL",
              slotVersion: "2000-01-01",
              acceptTerms: true,
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "does not confirm until a valid signed event, rejects spoofed totals and duplicates",
      async () => {
        const s = await slot();
        const r = await request(player, "/api/bookings", "POST", {
          slotId: s.id,
          provider: "safepay",
          choice: "ADVANCE",
          slotVersion: s.updatedAt,
          acceptTerms: true,
          total_minor: 1,
        });
        assert.equal(r.status, 201);
        assert.equal(r.body.booking.upfront_minor, 50000);
        assert.equal(r.body.booking.status, "PAYMENT_PENDING");
        assert.equal(r.body.booking.checkout_nonce, undefined);
        let b = await BookingRepo.find(r.body.booking.id);
        await BookingRepo.attachReference(b!.id, "track_" + b!.id);
        b = await BookingRepo.find(b!.id);
        assert.equal(
          (await request(other, `/api/bookings/${b!.id}`)).status,
          404,
        );
        assert.equal(
          (await request(owner, `/api/bookings/${b!.id}/checkout`, "POST", {}))
            .status,
          403,
        );
        assert.equal((await webhook(b, {}, false)).status, 400);
        assert.equal((await webhook(b, { amount: 1 })).status, 400);
        assert.equal((await webhook(b, { currency: "USD" })).status, 400);
        assert.equal((await webhook(b)).status, 200);
        assert.equal((await webhook(b)).status, 200);
        assert.equal((await BookingRepo.find(b!.id))!.paid_minor, 50000);
        assert.equal(
          (await VenueRepo.publicDetails(owner)).slots.some(
            (row) => row.id === s.id,
          ),
          false,
        );
        assert.equal(
          (
            await request(player, `/api/bookings/${b!.id}/cancel`, "POST", {
              reason: "Plans changed",
            })
          ).status,
          200,
        );
        assert.equal((await BookingRepo.find(b!.id))!.refund_due_minor, 0);
      },
    );
    await t.test(
      "JazzCash validates signatures, merchant and exact server-side amount",
      async () => {
        const s = await slot(),
          b = await BookingRepo.start(
            player,
            s.id,
            "jazzcash",
            "FULL",
            s.updatedAt,
          );
        const ref = await BookingRepo.attachReference(
          b.id,
          "T" + b.id.slice(0, 19),
        );
        const fields = {
          pp_TxnRefNo: ref,
          pp_MerchantID: "test-merchant",
          pp_ResponseCode: "000",
          pp_Amount: String(b.upfront_minor),
          pp_TxnCurrency: "PKR",
        };
        const signed = { ...fields, pp_SecureHash: jazzcashHash(fields) };
        assert.equal(validJazzcashSignature(signed), true);
        assert.equal(
          validJazzcashSignature({ ...signed, pp_Amount: "1" }),
          false,
        );
        assert.equal(
          (
            await request("", "/api/payments/jazzcash/return", "POST", {
              ...signed,
              pp_Amount: "1",
            })
          ).status,
          400,
        );
        assert.equal(
          (await request("", "/api/payments/jazzcash/return", "POST", signed))
            .status,
          200,
        );
        assert.equal((await BookingRepo.find(b.id))!.status, "CONFIRMED");
      },
    );
    await t.test(
      "only admins can record completed refunds and owners can list their bookings",
      async () => {
        const s = await slot(),
          b = await BookingRepo.start(
            player,
            s.id,
            "safepay",
            "FULL",
            s.updatedAt,
          );
        await BookingRepo.attachReference(b.id, "track_refund");
        await BookingRepo.settle(
          b.id,
          "track_refund",
          "safepay",
          "paid_refund",
          b.upfront_minor,
          "PKR",
          "PAID",
        );
        await request(player, `/api/bookings/${b.id}/cancel`, "POST", {
          reason: "Plans changed",
        });
        assert.equal(
          (await request(player, "/api/admin/booking-refunds")).status,
          403,
        );
        assert.equal(
          (await request(admin, "/api/admin/booking-refunds")).status,
          200,
        );
        assert.equal(
          (
            await request(
              player,
              `/api/admin/booking-refunds/${b.id}/record`,
              "POST",
              { reference: "refund_test" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              admin,
              `/api/admin/booking-refunds/${b.id}/record`,
              "POST",
              { reference: "refund_test" },
            )
          ).status,
          200,
        );
        assert.equal((await BookingRepo.find(b.id))!.refunded_minor, 150000);
        assert.equal((await request(owner, "/api/bookings/venue")).status, 200);
      },
    );
    await t.test(
      "only the sandbox wallet host is allowed and missing configuration fails closed",
      async () => {
        process.env.JAZZCASH_WALLET_URL = "https://example.com/collect-secrets";
        assert.equal(availableGateways().jazzcash, false);
        process.env.SAFEPAY_SECRET_KEY = "";
        assert.equal(availableGateways().safepay, false);
      },
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
