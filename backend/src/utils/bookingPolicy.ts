export type SlotPaymentPolicy = "FULL_ONLY" | "FULL_OR_ADVANCE";
export type BookingPaymentChoice = "FULL" | "ADVANCE";

/** Convert PKR to integer paisa before doing any payment arithmetic. */
export function moneyToMinor(value: unknown): number {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+(\.\d{1,2})?$/.test(String(value))
  ) {
    throw new Error("Enter an amount with up to two decimal places.");
  }
  const [rupees, decimal = ""] = String(value).split(".");
  const amount = Number(rupees) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) {
    throw new Error(
      "Booking prices must be greater than zero and at most PKR 1,000,000.",
    );
  }
  return amount;
}

export function bookingQuote(input: {
  price: unknown;
  paymentPolicy: SlotPaymentPolicy;
  advancePercent: number;
  choice: BookingPaymentChoice;
}) {
  const totalMinor = moneyToMinor(input.price);
  if (
    !["FULL_ONLY", "FULL_OR_ADVANCE"].includes(input.paymentPolicy) ||
    !["FULL", "ADVANCE"].includes(input.choice)
  ) {
    throw new Error("Choose a supported payment option.");
  }
  if (
    !Number.isInteger(input.advancePercent) ||
    input.advancePercent < 1 ||
    input.advancePercent > 99
  ) {
    throw new Error("Advance percentage must be a whole number from 1 to 99.");
  }
  if (input.choice === "ADVANCE" && input.paymentPolicy !== "FULL_OR_ADVANCE") {
    throw new Error("This slot requires full payment upfront.");
  }
  // Round up to the next paisa so the advance never falls below the stated share.
  const advanceMinor = Math.ceil((totalMinor * input.advancePercent) / 100);
  const upfrontMinor = input.choice === "FULL" ? totalMinor : advanceMinor;
  return {
    currency: "PKR" as const,
    totalMinor,
    advanceMinor,
    upfrontMinor,
    balanceMinor: totalMinor - upfrontMinor,
  };
}

export function cancellationDeadline(
  startsAt: string,
  hoursBefore: number,
): string {
  const start = Date.parse(startsAt);
  if (
    !Number.isFinite(start) ||
    !Number.isInteger(hoursBefore) ||
    hoursBefore < 0 ||
    hoursBefore > 720
  ) {
    throw new Error(
      "Cancellation notice must be a whole number of hours from 0 to 720.",
    );
  }
  return new Date(start - hoursBefore * 3600000).toISOString();
}
