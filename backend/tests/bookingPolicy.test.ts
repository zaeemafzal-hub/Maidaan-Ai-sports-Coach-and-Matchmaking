import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moneyToMinor,
  bookingQuote,
  cancellationDeadline,
} from "../src/utils/bookingPolicy.js";

test("booking money uses exact integer paisa and rejects zero upfront amounts", () => {
  assert.equal(moneyToMinor("1999.99"), 199999);
  assert.equal(moneyToMinor("0.01"), 1);
  for (const invalid of [
    0,
    -1,
    "1.001",
    true,
    null,
    "1e3",
    Infinity,
    "1000000.01",
  ])
    assert.throws(() => moneyToMinor(invalid));
});
test("advance and full quotes enforce the owner payment policy", () => {
  const input = {
    price: "1999.99",
    paymentPolicy: "FULL_OR_ADVANCE" as const,
    advancePercent: 25,
  };
  assert.deepEqual(bookingQuote({ ...input, choice: "ADVANCE" }), {
    currency: "PKR",
    totalMinor: 199999,
    advanceMinor: 50000,
    upfrontMinor: 50000,
    balanceMinor: 149999,
  });
  assert.equal(bookingQuote({ ...input, choice: "FULL" }).upfrontMinor, 199999);
  assert.equal(bookingQuote({ ...input, choice: "FULL" }).balanceMinor, 0);
  assert.throws(() =>
    bookingQuote({ ...input, paymentPolicy: "FULL_ONLY", choice: "ADVANCE" }),
  );
  for (const advancePercent of [0, 100, -10, 12.5])
    assert.throws(() =>
      bookingQuote({ ...input, advancePercent, choice: "ADVANCE" }),
    );
});
test("cancellation deadlines account for Pakistan time and calendar boundaries", () => {
  assert.equal(
    cancellationDeadline("2030-01-02T18:00:00+05:00", 24),
    "2030-01-01T13:00:00.000Z",
  );
  assert.equal(
    cancellationDeadline("2030-01-02T18:00:00+05:00", 0),
    "2030-01-02T13:00:00.000Z",
  );
  for (const hours of [-1, 721, 1.5])
    assert.throws(() =>
      cancellationDeadline("2030-01-02T18:00:00+05:00", hours),
    );
});
