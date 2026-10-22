import React, { useCallback, useState } from "react";
import { Text } from "../../components/theme/Primitives";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Page,
  Card,
  Action,
  Choices,
  Notice,
  Busy,
  styles,
} from "../../components/venues/VenueUI";
import { venueService } from "../../services/venueService";
import { bookingService } from "../../services/bookingService";
import { Venue, VenueSlot, slotLabel } from "../../types/venue";
import { pkr, pakistanDate } from "../../types/booking";
export default function NewBooking() {
  const { hubId, slotId } = useLocalSearchParams<{
    hubId: string;
    slotId: string;
  }>();
  const [hub, setHub] = useState<Venue | null>(null),
    [slot, setSlot] = useState<VenueSlot | null>(null),
    [gateways, setGateways] = useState({ safepay: false, jazzcash: false }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false),
    [choice, setChoice] = useState<"FULL" | "ADVANCE">("FULL"),
    [provider, setProvider] = useState<"safepay" | "jazzcash">("safepay"),
    [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      setAccepted(false);
      Promise.all([venueService.details(hubId), bookingService.gateways()])
        .then(([venue, methods]) => {
          if (!active) return;
          setHub(venue);
          setGateways(methods);
          if (!methods.safepay && methods.jazzcash) setProvider("jazzcash");
          const selected = venue.slots.find(
            (s) => s.id === slotId && s.bookingEnabled,
          );
          if (!selected)
            throw new Error("This slot is no longer available for booking.");
          setSlot(selected);
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
    }, [hubId, slotId, reload]),
  );
  async function start() {
    if (!slot?.updatedAt) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await bookingService.start(
        slot.id,
        provider,
        choice,
        slot.updatedAt,
      );
      router.replace(`/bookings/${booking.id}` as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start booking.");
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }
  const total = Math.round((slot?.price || 0) * 100),
    advance = Math.ceil((total * (slot?.advancePercent || 25)) / 100),
    upfront = choice === "FULL" ? total : advance;
  return (
    <Page title="Review booking">
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : hub && slot ? (
        <>
          <Card>
            <Text style={styles.title}>{hub.name}</Text>
            <Text style={styles.heading}>
              {hub.spaces.find((c) => c.id === slot.courtId)?.name}
            </Text>
            <Text style={styles.text}>{hub.location}</Text>
            <Text style={styles.text}>{slotLabel(slot)} PKT</Text>
            <Text style={styles.heading}>Total: {pkr(total)}</Text>
          </Card>
          <Card>
            <Text style={styles.heading}>Payment choice</Text>
            <Choices
              label="Pay upfront"
              options={
                slot.paymentPolicy === "FULL_OR_ADVANCE"
                  ? ["FULL", "ADVANCE"]
                  : ["FULL"]
              }
              value={choice}
              onChange={(v) => setChoice(v as typeof choice)}
            />
            <Text style={styles.heading}>Due now: {pkr(upfront)}</Text>
            <Text style={styles.text}>
              Remaining at venue: {pkr(total - upfront)}
            </Text>
            <Text style={styles.text}>
              The reservation is confirmed only after payment verification.
              Checkout holds the slot for up to 15 minutes. Unpaid or expired
              checkout is not a confirmed reservation.
            </Text>
          </Card>
          <Card>
            <Text style={styles.heading}>Cancellation terms</Text>
            <Text style={styles.text}>
              Cancel by{" "}
              {pakistanDate(
                new Date(
                  Date.parse(slot.startsAt) - slot.cancelBeforeHours * 3600000,
                ).toISOString(),
              )}{" "}
              ({slot.cancelBeforeHours} hours before the slot).
            </Text>
            <Text style={styles.text}>
              {slot.cancellationRefund === "FULL"
                ? "Before that deadline: full refund of the amount paid."
                : `Before that deadline: the venue retains ${pkr(advance)} (${slot.advancePercent}% of the total), including when you pay in full. Any amount paid above that is refundable.`}
            </Text>
            <Text style={styles.text}>
              After the deadline: you may cancel before the slot starts, with no
              refund. Cancellation is unavailable once the slot starts. If the
              owner cancels, the full upfront payment is refundable.
            </Text>
            <Text style={styles.text}>
              Refunds are processed through the original gateway. Eligible
              refunds appear as pending until completed.
            </Text>
          </Card>
          <Card>
            <Text style={styles.heading}>Sandbox payment method</Text>
            <Choices
              label="Gateway"
              options={["safepay", "jazzcash"]}
              value={provider}
              onChange={(v) => setProvider(v as typeof provider)}
            />
            <Text style={styles.text}>
              Test mode — no real money.{" "}
              {provider === "safepay"
                ? "Safepay opens its hosted checkout."
                : "JazzCash uses its test mobile-wallet API."}
            </Text>
            {!gateways[provider] ? (
              <Text style={styles.error}>
                This sandbox gateway is being configured. You can book after
                setup is complete.
              </Text>
            ) : null}
          </Card>
          <Action
            title={
              accepted
                ? "Terms accepted — tap to undo"
                : "I agree to the payment & cancellation terms"
            }
            secondary
            onPress={() => setAccepted((v) => !v)}
          />
          <Action
            title={busy ? "Starting checkout…" : "Continue to payment"}
            disabled={
              busy || !accepted || !gateways[provider] || !slot.updatedAt
            }
            onPress={start}
          />
          <Action
            title="Refresh price & availability"
            secondary
            disabled={busy}
            onPress={() => setReload((n) => n + 1)}
          />
        </>
      ) : (
        <Action
          title="Reload slot"
          secondary
          onPress={() => setReload((n) => n + 1)}
        />
      )}
    </Page>
  );
}
