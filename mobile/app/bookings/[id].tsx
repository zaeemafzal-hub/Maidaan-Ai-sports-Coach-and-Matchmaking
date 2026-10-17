import React, { useCallback, useEffect, useState } from "react";
import { Text, Platform } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Page,
  Card,
  Action,
  Notice,
  Busy,
  styles,
} from "../../components/venues/VenueUI";
import { FormInput } from "../../components/ui/FormInput";
import { bookingService } from "../../services/bookingService";
import { Booking, pkr, pakistanDate } from "../../types/booking";
import { useAuthStore } from "../../store/useAuthStore";
export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    user = useAuthStore((s) => s.currentUser?.id);
  const [booking, setBooking] = useState<Booking | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [mobile, setMobile] = useState(""),
    [cnic, setCnic] = useState(""),
    [reason, setReason] = useState(""),
    [cancelling, setCancelling] = useState(false),
    [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const b = await bookingService.details(id);
    setBooking(b);
    return b;
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      bookingService
        .details(id)
        .then((b) => {
          if (active) setBooking(b);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [id]),
  );
  useEffect(() => {
    if (booking?.status !== "PAYMENT_PENDING") return;
    let active = true;
    const timer = setInterval(() => {
      bookingService
        .details(id)
        .then((b) => {
          if (active) setBooking(b);
        })
        .catch(() => {});
    }, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, booking?.status]);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update booking.");
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    await run(async () => {
      const result = await bookingService.checkout(id, mobile, cnic);
      setCnic("");
      if (result.url) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.assign(result.url);
          return;
        }
        await WebBrowser.openBrowserAsync(result.url);
      } else
        setMessage(
          "Wallet payment submitted. Approve the sandbox request if prompted, then refresh the booking status.",
        );
    });
  }
  const owner = booking?.owner_id === user,
    customer = booking?.customer_id === user,
    active =
      booking && ["PAYMENT_PENDING", "CONFIRMED"].includes(booking.status),
    beforeStart = booking ? Date.parse(booking.starts_at) > Date.now() : false;
  const refundable = booking
    ? owner
      ? booking.paid_minor
      : Date.now() > Date.parse(booking.cancel_deadline)
        ? 0
        : booking.cancellation_refund === "FULL"
          ? booking.paid_minor
          : Math.max(0, booking.paid_minor - booking.advance_minor)
    : 0;
  return (
    <Page title="Booking details">
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : booking ? (
        <>
          <Card>
            <Text style={styles.title}>{booking.venue_name}</Text>
            <Text style={styles.heading}>{booking.space_name}</Text>
            <Text style={styles.text}>{booking.location}</Text>
            <Text style={styles.text}>
              {pakistanDate(booking.starts_at)} –{" "}
              {pakistanDate(booking.ends_at)}
            </Text>
            <Text style={styles.heading}>
              {booking.status.replace(/_/g, " ")}
            </Text>
            <Text style={styles.text}>Reference: {booking.id}</Text>
            <Text style={styles.text}>Sandbox · {booking.provider}</Text>
          </Card>
          <Card>
            <Text style={styles.heading}>Payment summary</Text>
            <Text style={styles.text}>Total: {pkr(booking.total_minor)}</Text>
            <Text style={styles.text}>
              Required upfront: {pkr(booking.upfront_minor)}
            </Text>
            <Text style={styles.text}>
              Verified upfront payment: {pkr(booking.paid_minor)}
            </Text>
            <Text style={styles.text}>
              Received at venue: {pkr(booking.venue_paid_minor)}
            </Text>
            <Text style={styles.text}>
              {booking.status === "CANCELLED" || booking.status === "EXPIRED"
                ? "Reservation inactive"
                : "Balance remaining"}
              :{" "}
              {booking.status === "CANCELLED" || booking.status === "EXPIRED"
                ? "No venue payment due"
                : pkr(booking.balance_minor)}
            </Text>
            {booking.status === "PAYMENT_PENDING" ? (
              <Text style={styles.text}>
                Pay by {pakistanDate(booking.hold_expires_at)}. This is a
                temporary hold, not a confirmed booking.
              </Text>
            ) : null}
            {booking.refund_due_minor > 0 ? (
              <>
                <Text style={styles.heading}>
                  Refund: {booking.refund_status}
                </Text>
                <Text style={styles.text}>
                  Eligible: {pkr(booking.refund_due_minor)} · Completed:{" "}
                  {pkr(booking.refunded_minor)}
                </Text>
                {booking.refund_status === "PENDING" ? (
                  <Text style={styles.text}>
                    Your refund is queued for processing through the original
                    gateway.
                  </Text>
                ) : null}
              </>
            ) : null}
          </Card>
          <Card>
            <Text style={styles.heading}>Your saved cancellation terms</Text>
            <Text style={styles.text}>
              Deadline: {pakistanDate(booking.cancel_deadline)}
            </Text>
            <Text style={styles.text}>
              {booking.cancellation_refund === "FULL"
                ? "Full refund of upfront payment before the deadline."
                : `Before the deadline, the venue keeps ${pkr(booking.advance_minor)} of the payment. Any excess paid is refundable.`}
            </Text>
            <Text style={styles.text}>
              After the deadline, cancellation before the start is allowed
              without a refund. Owner cancellations receive a full refund.
            </Text>
            {booking.cancellation_reason ? (
              <Text style={styles.text}>
                Cancellation reason: {booking.cancellation_reason}
              </Text>
            ) : null}
          </Card>
          {customer && booking.status === "PAYMENT_PENDING" ? (
            <Card>
              <Text style={styles.heading}>Complete sandbox payment</Text>
              {booking.provider === "jazzcash" ? (
                <>
                  <FormInput
                    label="Sandbox wallet number"
                    value={mobile}
                    keyboardType="phone-pad"
                    placeholder="03xxxxxxxxx"
                    onChangeText={setMobile}
                  />
                  <FormInput
                    label="Test CNIC last 6 digits"
                    value={cnic}
                    keyboardType="number-pad"
                    onChangeText={setCnic}
                  />
                  <Text style={styles.text}>
                    Use JazzCash's supplied sandbox test details. Never enter a
                    wallet PIN here.
                  </Text>
                </>
              ) : null}
              <Action
                title={
                  busy
                    ? "Opening payment…"
                    : booking.provider === "safepay"
                      ? "Pay with Safepay sandbox"
                      : "Pay with JazzCash sandbox"
                }
                disabled={busy}
                onPress={pay}
              />
            </Card>
          ) : null}
          {message ? <Text style={styles.text}>{message}</Text> : null}
          <Action
            title="Refresh booking status"
            secondary
            disabled={busy}
            onPress={() => run(refresh)}
          />
          {(owner || customer) && active && beforeStart ? (
            <Action
              title="Cancel reservation"
              danger
              disabled={busy}
              onPress={() => setCancelling((v) => !v)}
            />
          ) : null}
          {cancelling && active ? (
            <Card>
              <Text style={styles.heading}>Confirm cancellation</Text>
              <Text style={styles.text}>
                Refund under the saved terms: {pkr(refundable)}. Eligible
                refunds are processed separately; cancelling does not mean the
                money has already been returned.
              </Text>
              <FormInput
                label="Cancellation reason"
                multiline
                value={reason}
                onChangeText={setReason}
              />
              <Action
                title="Confirm cancellation"
                danger
                disabled={busy || reason.trim().length < 5}
                onPress={() =>
                  run(async () => {
                    await bookingService.cancel(id, reason);
                    setCancelling(false);
                  })
                }
              />
              <Action
                title="Keep reservation"
                secondary
                disabled={busy}
                onPress={() => setCancelling(false)}
              />
            </Card>
          ) : null}
          {owner &&
          booking.status === "CONFIRMED" &&
          !beforeStart &&
          booking.balance_minor > 0 ? (
            <Action
              title="Record balance received at venue"
              disabled={busy}
              onPress={() => run(() => bookingService.recordBalance(id))}
            />
          ) : null}
          <Action
            title="My bookings"
            secondary
            onPress={() => router.push("/bookings" as any)}
          />
        </>
      ) : (
        <Action title="Retry loading booking" onPress={() => run(refresh)} />
      )}
    </Page>
  );
}
