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
  payment_choice: "FULL" | "ADVANCE";
  total_minor: number;
  advance_minor: number;
  upfront_minor: number;
  paid_minor: number;
  venue_paid_minor: number;
  balance_minor: number;
  cancel_before_hours: number;
  cancellation_refund: "FULL" | "KEEP_ADVANCE";
  cancel_deadline: string;
  hold_expires_at: string;
  refund_due_minor: number;
  refunded_minor: number;
  refund_status: "NONE" | "PENDING" | "REFUNDED";
  cancellation_reason?: string;
  created_at: string;
}
export function pkr(minor: number) {
  return `PKR ${(minor / 100).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export function pakistanDate(value: string) {
  return (
    new Date(value).toLocaleString("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " PKT"
  );
}
