import crypto from "node:crypto";
import Safepay from "@sfpy/node-core";
import { Booking, BookingRepo } from "../models/bookingRepo.js";
import { VenueError } from "../models/venueRepo.js";

// Sandbox hosts are fixed in code; no live-money mode or arbitrary request URL.
const SAFE_HOST = "https://sandbox.api.getsafepay.com";
export function availableGateways() {
  return {
    sandbox: true,
    safepay: Boolean(
      process.env.SAFEPAY_PUBLIC_KEY &&
      process.env.SAFEPAY_SECRET_KEY &&
      process.env.SAFEPAY_WEBHOOK_SECRET &&
      publicUrl(),
    ),
    jazzcash: Boolean(
      process.env.JAZZCASH_MERCHANT_ID &&
      process.env.JAZZCASH_PASSWORD &&
      process.env.JAZZCASH_INTEGRITY_SALT &&
      walletUrl(),
    ),
  };
}
function publicUrl() {
  const value = process.env.PAYMENTS_PUBLIC_URL?.replace(/\/+$/, "");
  try {
    const u = new URL(value || "");
    return u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
}
function walletUrl() {
  try {
    const u = new URL(process.env.JAZZCASH_WALLET_URL || "");
    return u.protocol === "https:" &&
      u.hostname === "sandbox.jazzcash.com.pk" &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
function safeClient() {
  return new Safepay(process.env.SAFEPAY_SECRET_KEY!, {
    authType: "secret",
    host: SAFE_HOST,
    timeout: 20000,
  });
}
export function requireGateway(provider: string) {
  const available = availableGateways();
  if (!["safepay", "jazzcash"].includes(provider))
    throw new VenueError(400, "Choose Safepay or JazzCash.");
  if (!available[provider as "safepay" | "jazzcash"])
    throw new VenueError(
      503,
      `${provider === "safepay" ? "Safepay" : "JazzCash"} sandbox is not configured yet.`,
    );
}
export async function safepayCheckout(b: Booking) {
  requireGateway("safepay");
  const client = safeClient();
  let reference = b.payment_reference;
  if (!reference) {
    const response = await client.payments.session.setup({
      merchant_api_key: process.env.SAFEPAY_PUBLIC_KEY,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: b.upfront_minor,
      metadata: { order_id: b.id, source: "maidaan" },
      include_fees: false,
    });
    const tracker = response?.data?.tracker?.token;
    if (typeof tracker !== "string" || !tracker.startsWith("track_"))
      throw new VenueError(502, "Safepay did not create a payment session.");
    reference = await BookingRepo.attachReference(b.id, tracker);
  }
  const passport = await client.client.passport.create();
  if (typeof passport?.data !== "string")
    throw new VenueError(502, "Safepay checkout is temporarily unavailable.");
  // Safepay appends order_id and tracker to this URL itself.
  const returnUrl = `${publicUrl()}/api/payments/return`;
  return client.checkout.createCheckoutUrl({
    env: "sandbox",
    tbt: passport.data,
    tracker: reference,
    source: "hosted",
    order_id: b.id,
    redirect_url: returnUrl,
    cancel_url: returnUrl,
  });
}
export function validSafepaySignature(raw: Buffer, signature: string) {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!secret || !/^[a-f\d]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha512", secret).update(raw).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function jazzcashHash(
  fields: Record<string, string>,
  salt = process.env.JAZZCASH_INTEGRITY_SALT || "",
) {
  const values = Object.keys(fields)
    .filter(
      (key) =>
        /^pp/i.test(key) && key !== "pp_SecureHash" && fields[key] !== "",
    )
    .sort()
    .map((key) => fields[key]);
  return crypto
    .createHmac("sha256", salt)
    .update(`${salt}&${values.join("&")}`, "utf8")
    .digest("hex")
    .toUpperCase();
}
export function validJazzcashSignature(fields: Record<string, string>) {
  const signature = fields.pp_SecureHash;
  if (
    !process.env.JAZZCASH_INTEGRITY_SALT ||
    typeof signature !== "string" ||
    !/^[a-f\d]{64}$/i.test(signature)
  )
    return false;
  return crypto.timingSafeEqual(
    Buffer.from(jazzcashHash(fields), "hex"),
    Buffer.from(signature, "hex"),
  );
}
function pakistanTimestamp(date: Date) {
  return new Date(date.getTime() + 5 * 3600000)
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
}
// One wallet call per booking protects against duplicate debit requests after timeouts.
const walletCalls = new Set<string>();
export async function jazzcashWallet(
  b: Booking,
  mobile: unknown,
  cnic: unknown,
) {
  requireGateway("jazzcash");
  if (
    typeof mobile !== "string" ||
    !/^03\d{9}$/.test(mobile) ||
    typeof cnic !== "string" ||
    !/^\d{6}$/.test(cnic)
  )
    throw new VenueError(
      400,
      "Enter a sandbox wallet number (03xxxxxxxxx) and the last six CNIC digits.",
    );
  const { supabaseAdmin } = await import("../lib/supabase.js");
  const { allowsMemoryStores } = await import("../config/runtime.js");
  if (allowsMemoryStores()) {
    if (walletCalls.has(b.id))
      throw new VenueError(
        409,
        "Payment already submitted. Refresh its status instead.",
      );
    walletCalls.add(b.id);
  } else {
    const { data, error } = await supabaseAdmin
      .from("venue_bookings")
      .update({ wallet_submitted_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("wallet_submitted_at", null)
      .select("id");
    if (error) throw new Error("Unable to start wallet payment.");
    if (!data?.length)
      throw new VenueError(
        409,
        "Payment already submitted. Refresh its status instead.",
      );
  }
  const reference = await BookingRepo.attachReference(
    b.id,
    "T" + b.id.replace(/-/g, "").slice(0, 19),
  );
  const fields: Record<string, string> = {
    pp_Version: "1.1",
    pp_Language: "EN",
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID!,
    pp_Password: process.env.JAZZCASH_PASSWORD!,
    pp_TxnRefNo: reference,
    pp_MobileNumber: mobile,
    pp_CNIC: cnic,
    pp_Amount: String(b.upfront_minor),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: pakistanTimestamp(new Date()),
    pp_BillReference: b.id.replace(/-/g, "").slice(0, 20),
    pp_Description: "Maidaan venue booking",
    pp_TxnExpiryDateTime: pakistanTimestamp(new Date(b.hold_expires_at)),
  };
  fields.pp_SecureHash = jazzcashHash(fields);
  try {
    const res = await fetch(walletUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error("Gateway unavailable");
    const reply = (await res.json()) as Record<string, string>;
    await acceptJazzcashPayment(reply);
    return { submitted: true };
  } catch (error) {
    if (error instanceof VenueError) throw error;
    throw new VenueError(
      502,
      "Wallet payment was submitted but could not be confirmed. Refresh the booking status; do not send another payment.",
    );
  }
}
export async function acceptJazzcashPayment(fields: Record<string, string>) {
  if (
    Object.values(fields).some((v) => typeof v !== "string") ||
    !validJazzcashSignature(fields)
  )
    throw new VenueError(400, "Invalid payment signature.");
  if (fields.pp_MerchantID !== process.env.JAZZCASH_MERCHANT_ID)
    throw new VenueError(400, "Invalid merchant.");
  if (fields.pp_ResponseCode !== "000")
    throw new VenueError(
      409,
      "JazzCash has not confirmed this payment. Refresh after approving the sandbox wallet request.",
    );
  const booking = await BookingRepo.byReference("jazzcash", fields.pp_TxnRefNo);
  if (!booking) throw new VenueError(404, "Payment reference not found.");
  if (!/^\d+$/.test(fields.pp_Amount))
    throw new VenueError(400, "Invalid payment amount.");
  return BookingRepo.settle(
    booking.id,
    fields.pp_TxnRefNo,
    "jazzcash",
    "paid:" + fields.pp_TxnRefNo,
    Number(fields.pp_Amount),
    fields.pp_TxnCurrency,
    "PAID",
  );
}
export async function acceptSafepayEvent(raw: Buffer, signature: string) {
  if (!validSafepaySignature(raw, signature))
    throw new VenueError(400, "Invalid payment signature.");
  let event: any;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new VenueError(400, "Invalid payment event.");
  }
  if (!["payment.succeeded", "payment.refunded"].includes(event.type)) return;
  if (
    event.merchant_api_key !== process.env.SAFEPAY_PUBLIC_KEY ||
    typeof event.token !== "string" ||
    event.token.length > 200
  )
    throw new VenueError(400, "Invalid payment event.");
  const data = event.data,
    booking = await BookingRepo.byReference("safepay", data?.tracker);
  if (!booking) throw new VenueError(404, "Payment reference not found.");
  if (event.type === "payment.refunded" && booking.refund_status === "REFUNDED")
    return;
  const amount =
    event.type === "payment.succeeded" ? data.amount : data.refund_amount;
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new VenueError(400, "Invalid payment amount.");
  if (event.type === "payment.succeeded" && data.state !== "TRACKER_ENDED")
    throw new VenueError(400, "Payment has not been captured.");
  return BookingRepo.settle(
    booking.id,
    data.tracker,
    "safepay",
    event.token,
    amount,
    data.currency,
    event.type === "payment.succeeded" ? "PAID" : "REFUNDED",
  );
}
