import React, { useCallback, useState } from "react";
import { Text } from "../../components/theme/Primitives";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Page,
  Card,
  Action,
  Notice,
  Busy,
  styles,
} from "../../components/venues/VenueUI";
import { bookingService } from "../../services/bookingService";
import { Booking, pkr, pakistanDate } from "../../types/booking";
import { FormInput } from "../../components/ui/FormInput";
import { useAuthStore } from "../../store/useAuthStore";
export default function Bookings() {
  const { scope } = useLocalSearchParams<{ scope?: string }>(),
    mode =
      scope === "owner"
        ? "owner"
        : scope === "refunds"
          ? "refunds"
          : "customer";
  const roles = useAuthStore((s) => s.roles),
    allowed =
      mode === "owner"
        ? roles.includes("HUB_OWNER")
        : mode === "refunds"
          ? roles.includes("ADMIN")
          : true;
  const [rows, setRows] = useState<Booking[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState(""),
    [reference, setReference] = useState(""),
    [busy, setBusy] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) return;
      setLoading(true);
      setError(null);
      bookingService
        .list(mode)
        .then((b) => {
          if (active) setRows(b);
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
    }, [mode, allowed, reload]),
  );
  async function record(id: string) {
    setBusy(true);
    setError(null);
    try {
      await bookingService.recordRefund(id, reference);
      setSelected("");
      setReference("");
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record refund.");
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <Page title="Bookings">
        <Text style={styles.text}>
          This workspace requires{" "}
          {mode === "owner" ? "hub owner" : "super-user"} access.
        </Text>
      </Page>
    );
  return (
    <Page
      title={
        mode === "owner"
          ? "Venue reservations"
          : mode === "refunds"
            ? "Booking refunds"
            : "My bookings"
      }
    >
      <Text style={styles.title}>
        {mode === "owner"
          ? "Manage venue reservations"
          : mode === "refunds"
            ? "Refunds to process"
            : "Your venue bookings"}
      </Text>
      <Text style={styles.text}>
        {mode === "refunds"
          ? "Process each eligible refund in the original gateway dashboard. Record its completed transaction reference below. This action records a completed refund; it does not transfer funds."
          : "Open a reservation to see its saved payment and cancellation terms. Showing the latest 100 bookings."}
      </Text>
      <Action
        title="Refresh bookings"
        secondary
        onPress={() => setReload((n) => n + 1)}
      />
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : !error ? (
        rows.length ? (
          rows.map((b) => (
            <Card key={b.id}>
              <Text style={styles.heading}>
                {b.venue_name} · {b.space_name}
              </Text>
              <Text style={styles.text}>{pakistanDate(b.starts_at)}</Text>
              <Text style={styles.text}>
                {b.status.replace(/_/g, " ")} · {b.provider} sandbox
              </Text>
              <Text style={styles.text}>
                Paid upfront: {pkr(b.paid_minor)}
                {mode === "refunds"
                  ? ` · Refund due: ${pkr(b.refund_due_minor - b.refunded_minor)}`
                  : ""}
              </Text>
              <Action
                title="View reservation"
                secondary
                onPress={() => router.push(`/bookings/${b.id}` as any)}
              />
              {mode === "refunds" ? (
                <>
                  <Action
                    title="Record completed gateway refund"
                    disabled={busy}
                    onPress={() => {
                      setSelected(b.id);
                      setReference("");
                    }}
                  />
                  {selected === b.id ? (
                    <>
                      <FormInput
                        label="Completed gateway refund reference"
                        value={reference}
                        onChangeText={setReference}
                      />
                      <Text style={styles.error}>
                        Only confirm after the gateway shows this refund as
                        completed.
                      </Text>
                      <Action
                        title="Confirm completed refund record"
                        disabled={busy || reference.trim().length < 5}
                        onPress={() => record(b.id)}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </Card>
          ))
        ) : (
          <Text style={styles.text}>No bookings found.</Text>
        )
      ) : null}
    </Page>
  );
}
