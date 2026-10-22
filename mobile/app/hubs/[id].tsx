import React, { useCallback, useState } from "react";
import { Text, Linking } from "../../components/theme/Primitives";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Page,
  Card,
  Action,
  Choices,
  Notice,
  Busy,
  Gallery,
  styles,
} from "../../components/venues/VenueUI";
import { Venue, slotLabel } from "../../types/venue";
import { venueService } from "../../services/venueService";
import { chatService } from "../../services/chatService";
import { useAuthStore } from "../../store/useAuthStore";
export default function PublicHub() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    currentId = useAuthStore((s) => s.currentUser?.id);
  const [hub, setHub] = useState<Venue | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [sport, setSport] = useState("All"),
    [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      venueService
        .details(id)
        .then((v) => {
          if (active) setHub(v);
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
    }, [id, reload]),
  );
  async function contact() {
    if (!hub) return;
    setBusy(true);
    try {
      const room = await chatService.openDirectChat(hub.id);
      router.push(`/chat/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open chat.");
    } finally {
      setBusy(false);
    }
  }
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setError("Unable to open this link on your device.");
    }
  }
  return (
    <Page title={hub?.name || "Hub details"}>
      <Notice error={error} />
      {error ? (
        <Action
          title="Reload venue"
          secondary
          onPress={() => setReload((n) => n + 1)}
        />
      ) : null}
      {loading ? (
        <Busy />
      ) : hub ? (
        <>
          <Gallery urls={hub.photoUrls} />
          <Text style={styles.title}>{hub.name}</Text>
          <Text style={styles.text}>
            {hub.isVerified ? "Verified venue" : "Venue verification pending"}
          </Text>
          <Card>
            <Text style={styles.heading}>{hub.location}</Text>
            {hub.description ? (
              <Text style={styles.text}>{hub.description}</Text>
            ) : null}
            <Action
              title="View location on map"
              secondary
              onPress={() =>
                open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hub.latitude != null && hub.longitude != null ? `${hub.latitude},${hub.longitude}` : hub.location)}`,
                )
              }
            />
            {currentId !== hub.id ? (
              <Action
                title={busy ? "Opening chat…" : "Contact venue owner"}
                disabled={busy}
                onPress={contact}
              />
            ) : null}
            {hub.contactNumber ? (
              <>
                <Text style={styles.text}>{hub.contactNumber}</Text>
                <Action
                  title="Call venue"
                  secondary
                  onPress={() =>
                    open(`tel:${hub.contactNumber.replace(/[^\d+]/g, "")}`)
                  }
                />
              </>
            ) : null}
          </Card>
          <Text style={styles.heading}>Playing spaces & available slots</Text>
          <Text style={styles.text}>
            Prices cover the full time slot in PKR. All times are Pakistan time.
            Book eligible slots with a verified upfront payment. Review each
            slot's payment and cancellation terms before checkout.
          </Text>
          <Choices
            label="Filter sport"
            options={[
              "All",
              ...Array.from(
                new Set([...hub.sports, ...hub.spaces.map((s) => s.sport)]),
              ),
            ]}
            value={sport}
            onChange={setSport}
          />
          {hub.spaces
            .filter((s) => sport === "All" || s.sport === sport)
            .map((s) => (
              <Card key={s.id}>
                <Text style={styles.heading}>
                  {s.areaName ? `${s.areaName} · ` : ""}
                  {s.name}
                </Text>
                <Gallery urls={s.photoUrls} />
                <Text style={styles.text}>
                  {s.sport} · {s.playFormat || "Playing format not specified"} ·{" "}
                  {s.isIndoor ? "Indoor" : "Outdoor"}
                  {s.surface ? ` · ${s.surface}` : ""}
                  {s.playerCapacity
                    ? ` · Up to ${s.playerCapacity} players`
                    : ""}
                  {s.status === "LIMITED" ? " · Limited hours" : ""}
                </Text>
                {hub.slots
                  .filter((t) => t.courtId === s.id)
                  .map((t) => (
                    <Card key={t.id}>
                      <Text style={styles.text}>{slotLabel(t)} PKT</Text>
                      <Text style={styles.heading}>
                        PKR {t.price.toLocaleString()}
                      </Text>
                      <Text style={styles.text}>
                        Available · full-slot price
                      </Text>
                      {t.bookingEnabled ? <>
                        <Text style={styles.text}>{t.paymentPolicy==='FULL_ONLY'?'Full payment upfront required':`Full payment or ${t.advancePercent}% advance`}</Text>
                        <Text style={styles.text}>Cancellation notice: {t.cancelBeforeHours} hours. {t.cancellationRefund==='FULL'?'Full refund before deadline.':`The venue keeps ${t.advancePercent}% of the total before deadline.`} No refund after the deadline.</Text>
                        {currentId!==hub.id?<Action title="Review & book slot" onPress={()=>router.push(`/bookings/new?hubId=${hub.id}&slotId=${t.id}` as any)}/>:null}
                      </>:<Text style={styles.text}>Contact the venue to arrange this slot.</Text>}
                    </Card>
                  ))}
                {!hub.slots.some((t) => t.courtId === s.id) ? (
                  <Text style={styles.text}>
                    No upcoming slots published. Contact the venue for
                    availability.
                  </Text>
                ) : null}
              </Card>
            ))}
          {!hub.spaces.length ? (
            <Text style={styles.text}>
              The owner has not published playing spaces yet.
            </Text>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
