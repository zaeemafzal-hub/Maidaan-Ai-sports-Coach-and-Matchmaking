import assert from "node:assert/strict";
import fs from "node:fs";
import { BookingRepo } from "../src/models/bookingRepo.js";
import { VenueRepo } from "../src/models/venueRepo.js";

// Uses only disposable accounts created by verifyVenueAdmin.ts --keep.
// This verifies database holds and cancellation, never simulates gateway payment.
async function main() {
  const fixture = JSON.parse(
    fs.readFileSync("../output/.env.hub-verification", "utf8"),
  );
  const owner = fixture.users.find((user: any) => user.kind === "owner").id;
  const player = fixture.users.find((user: any) => user.kind === "player").id;
  const original = (await VenueRepo.slots(owner, true))[0];
  assert.ok(original, "Temporary venue needs an available slot");
  const input = {
    ...original,
    bookingEnabled: true,
    paymentPolicy: "FULL_OR_ADVANCE" as const,
    advancePercent: 25,
    cancelBeforeHours: 24,
    cancellationRefund: "KEEP_ADVANCE" as const,
  };
  const slot = await VenueRepo.saveSlot(owner, input, original.id);
  const first = await BookingRepo.start(
    player,
    slot.id,
    "safepay",
    "ADVANCE",
    slot.updatedAt,
  );
  assert.equal(first.status, "PAYMENT_PENDING");
  assert.equal(first.paid_minor, 0);
  assert.equal(first.upfront_minor, Math.ceil(first.total_minor / 4));
  assert.equal(
    (
      await BookingRepo.start(
        player,
        slot.id,
        "safepay",
        "ADVANCE",
        slot.updatedAt,
      )
    ).id,
    first.id,
  );
  assert.ok(
    !(await VenueRepo.slots(owner, true)).some((s) => s.id === slot.id),
  );
  await assert.rejects(() =>
    VenueRepo.saveSlot(owner, { ...input, price: 9000 }, slot.id),
  );
  await BookingRepo.cancel(
    player,
    first.id,
    "Verification cancelled unpaid checkout",
  );
  assert.ok((await VenueRepo.slots(owner, true)).some((s) => s.id === slot.id));
  const second = await BookingRepo.start(
    player,
    slot.id,
    "safepay",
    "FULL",
    slot.updatedAt,
  );
  assert.equal(second.upfront_minor, second.total_minor);
  await BookingRepo.cancel(
    player,
    second.id,
    "Verification cancelled full-payment checkout",
  );
  await assert.rejects(() => VenueRepo.deleteSlot(owner, slot.id));
  console.log(
    "PASS live Supabase booking RPCs: positive advance/full quotes, idempotent hold, public slot exclusion, reserved-slot edit protection, cancellation release, history protection. No payment was simulated or charged.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
