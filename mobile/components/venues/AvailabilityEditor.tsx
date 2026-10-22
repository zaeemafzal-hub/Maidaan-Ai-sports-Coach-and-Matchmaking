import React, { useCallback, useState } from "react";
import { Text, View } from "../theme/Primitives";
import { useFocusEffect } from "expo-router";
import { FormInput } from "../ui/FormInput";
import { useAuthStore } from "../../store/useAuthStore";
import { venueService } from "../../services/venueService";
import {
  Venue,
  SpaceInput,
  SlotInput,
  PlayingSpace,
  SPORTS,
  FORMATS,
  slotLabel,
} from "../../types/venue";
import {
  Page,
  Card,
  Action,
  Choices,
  Notice,
  Busy,
  PhotoEditor,
  styles,
} from "./VenueUI";
const blankSpace: SpaceInput = {
  name: "",
  sport: "cricket",
  status: "AVAILABLE",
  areaName: "",
  playFormat: "",
  surface: "",
  isIndoor: false,
  playerCapacity: null,
  photoUrls: [],
};
const blankSlot: SlotInput = {
  courtId: "",
  date: "",
  startTime: "18:00",
  endTime: "20:00",
  price: "",
  status: "AVAILABLE",
  bookingEnabled: true,
  paymentPolicy: "FULL_ONLY",
  advancePercent: 25,
  cancelBeforeHours: 24,
  cancellationRefund: "FULL",
};
export default function AvailabilityEditor() {
  const [scrollSignal, setScrollSignal] = useState(0);
  const allowed = useAuthStore((s) => s.roles.includes("HUB_OWNER"));
  const [venue, setVenue] = useState<Venue | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const [space, setSpace] = useState<SpaceInput | null>(null),
    [spaceId, setSpaceId] = useState<string | undefined>(),
    [capacity, setCapacity] = useState("");
  const [slot, setSlot] = useState<SlotInput | null>(null),
    [slotId, setSlotId] = useState<string | undefined>(),
    [confirm, setConfirm] = useState<{
      type: "space" | "slot";
      id: string;
      name: string;
    } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) return;
      setLoading(true);
      venueService
        .own()
        .then((v) => {
          if (active) {
            setVenue(v);
            setError(null);
          }
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
    }, [allowed]),
  );
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setVenue(await venueService.own());
      setSpace(null);
      setSlot(null);
      setConfirm(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update availability.",
      );
    } finally {
      setBusy(false);
    }
  }
  function editSpace(s?: PlayingSpace) {
    setScrollSignal((n) => n + 1);
    setError(null);
    setSpace(s || { ...blankSpace });
    setSpaceId(s?.id);
    setCapacity(s?.playerCapacity == null ? "" : String(s.playerCapacity));
    setSlot(null);
  }
  function changeSpace<K extends keyof SpaceInput>(
    key: K,
    value: SpaceInput[K],
  ) {
    setSpace((s) => (s ? { ...s, [key]: value } : s));
  }
  function changeSlot<K extends keyof SlotInput>(key: K, value: SlotInput[K]) {
    setSlot((s) => (s ? { ...s, [key]: value } : s));
  }
  if (!allowed)
    return (
      <Page title="Availability">
        <Text style={styles.text}>A hub owner account is required.</Text>
      </Page>
    );
  return (
    <Page title="Playing spaces & slots" scrollSignal={scrollSignal}>
      <Text style={styles.title}>Publish when you are available.</Text>
      <Text style={styles.text}>
        Create each pitch or court, then add dated time slots and a full-slot
        price. All times are Pakistan time (24-hour).
      </Text>
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : venue ? (
        <>
          <Action
            title="Add playing space"
            disabled={busy || uploading}
            onPress={() => editSpace()}
          />
          {space ? (
            <Card>
              <Text style={styles.heading}>
                {spaceId ? "Edit playing space" : "New playing space"}
              </Text>
              <FormInput
                label="Ground / hall"
                placeholder="Ground 1"
                value={space.areaName}
                onChangeText={(v) => changeSpace("areaName", v)}
              />
              <FormInput
                label="Pitch / court name"
                placeholder="Pitch 1"
                value={space.name}
                onChangeText={(v) => changeSpace("name", v)}
              />
              <Choices
                label="Sport"
                options={SPORTS}
                value={space.sport}
                onChange={(v) =>
                  setSpace((s) =>
                    s
                      ? {
                          ...s,
                          sport: v as SpaceInput["sport"],
                          playFormat: "",
                        }
                      : s,
                  )
                }
              />
              <Choices
                label="Playing format"
                options={FORMATS[space.sport]}
                value={space.playFormat}
                onChange={(v) => changeSpace("playFormat", v)}
              />
              <FormInput
                label="Surface"
                placeholder="Artificial turf / wooden / concrete"
                value={space.surface}
                onChangeText={(v) => changeSpace("surface", v)}
              />
              <FormInput
                label="Player capacity (optional)"
                keyboardType="number-pad"
                value={capacity}
                onChangeText={setCapacity}
              />
              <Choices
                label="Setting"
                options={["Indoor", "Outdoor"]}
                value={space.isIndoor ? "Indoor" : "Outdoor"}
                onChange={(v) => changeSpace("isIndoor", v === "Indoor")}
              />
              <Choices
                label="Operational status"
                options={["AVAILABLE", "LIMITED", "UNAVAILABLE"]}
                value={space.status}
                onChange={(v) =>
                  changeSpace("status", v as SpaceInput["status"])
                }
              />
              <Text style={styles.text}>
                Unavailable spaces and their slots are hidden from players.
              </Text>
              <PhotoEditor
                urls={space.photoUrls}
                onChange={(v) => changeSpace("photoUrls", v)}
                onBusyChange={setUploading}
              />
              <Action
                title={busy ? "Saving…" : "Save playing space"}
                disabled={busy || uploading}
                onPress={() =>
                  run(() =>
                    venueService.saveSpace(
                      {
                        ...space,
                        playerCapacity: capacity.trim()
                          ? Number(capacity)
                          : null,
                      },
                      spaceId,
                    ),
                  )
                }
              />
              <Action
                title="Cancel editing"
                secondary
                disabled={busy || uploading}
                onPress={() => setSpace(null)}
              />
            </Card>
          ) : null}
          {slot ? (
            <Card>
              <Text style={styles.heading}>
                {slotId ? "Edit slot" : "New availability slot"}
              </Text>
              <Text style={styles.text}>
                {venue.spaces.find((s) => s.id === slot.courtId)?.name}
              </Text>
              <FormInput
                label="Date (YYYY-MM-DD)"
                value={slot.date}
                placeholder="2026-10-20"
                onChangeText={(v) => changeSlot("date", v)}
              />
              <FormInput
                label="Start time (HH:MM)"
                value={slot.startTime}
                onChangeText={(v) => changeSlot("startTime", v)}
              />
              <FormInput
                label="End time (HH:MM)"
                value={slot.endTime}
                onChangeText={(v) => changeSlot("endTime", v)}
              />
              <FormInput
                label="Full-slot price (PKR)"
                keyboardType="decimal-pad"
                value={slot.price}
                onChangeText={(v) => changeSlot("price", v)}
              />
              <Choices
                label="Publish slot"
                options={["AVAILABLE", "UNAVAILABLE"]}
                value={slot.status}
                onChange={(v) => changeSlot("status", v as SlotInput["status"])}
              />
              <Choices
                label="Booking method"
                options={["Online booking", "Contact only"]}
                value={slot.bookingEnabled ? "Online booking" : "Contact only"}
                onChange={(v) =>
                  changeSlot("bookingEnabled", v === "Online booking")
                }
              />
              {slot.bookingEnabled ? (
                <>
                  <Choices
                    label="Upfront payment options"
                    options={["Full payment only", "Full or advance payment"]}
                    value={
                      slot.paymentPolicy === "FULL_ONLY"
                        ? "Full payment only"
                        : "Full or advance payment"
                    }
                    onChange={(v) =>
                      changeSlot(
                        "paymentPolicy",
                        v === "Full payment only"
                          ? "FULL_ONLY"
                          : "FULL_OR_ADVANCE",
                      )
                    }
                  />
                  <Choices
                    label="Refund before the cancellation deadline"
                    options={["Full refund", "Keep disclosed advance"]}
                    value={
                      slot.cancellationRefund === "FULL"
                        ? "Full refund"
                        : "Keep disclosed advance"
                    }
                    onChange={(v) =>
                      changeSlot(
                        "cancellationRefund",
                        v === "Full refund" ? "FULL" : "KEEP_ADVANCE",
                      )
                    }
                  />
                  {slot.paymentPolicy === "FULL_OR_ADVANCE" ||
                  slot.cancellationRefund === "KEEP_ADVANCE" ? (
                    <FormInput
                      label="Advance / retained amount (%)"
                      keyboardType="number-pad"
                      value={String(slot.advancePercent)}
                      onChangeText={(v) =>
                        changeSlot("advancePercent", v === "" ? 0 : Number(v))
                      }
                    />
                  ) : null}
                  <FormInput
                    label="Cancellation notice (hours before start)"
                    keyboardType="number-pad"
                    value={String(slot.cancelBeforeHours)}
                    onChangeText={(v) =>
                      changeSlot("cancelBeforeHours", v === "" ? 0 : Number(v))
                    }
                  />
                  <Text style={styles.text}>
                    A verified upfront payment is required. After this deadline,
                    users may cancel before the slot starts but receive no
                    refund. Owner cancellations require a full refund. Booking
                    terms are saved when checkout starts.
                  </Text>
                </>
              ) : null}
              <Action
                title={busy ? "Saving…" : "Save availability slot"}
                disabled={busy}
                onPress={() => run(() => venueService.saveSlot(slot, slotId))}
              />
              <Action
                title="Cancel slot editing"
                secondary
                disabled={busy}
                onPress={() => setSlot(null)}
              />
            </Card>
          ) : null}
          {confirm ? (
            <Card>
              <Text style={styles.heading}>Remove {confirm.name}?</Text>
              <Text style={styles.text}>
                {confirm.type === "space"
                  ? "This also removes all availability slots for this playing space."
                  : "This slot will no longer be visible to players."}
              </Text>
              <Action
                title="Confirm removal"
                danger
                disabled={busy}
                onPress={() =>
                  run(() =>
                    confirm.type === "space"
                      ? venueService.deleteSpace(confirm.id)
                      : venueService.deleteSlot(confirm.id),
                  )
                }
              />
              <Action
                title="Keep it"
                secondary
                disabled={busy}
                onPress={() => setConfirm(null)}
              />
            </Card>
          ) : null}
          {!venue.spaces.length ? (
            <Card>
              <Text style={styles.text}>
                No playing spaces yet. Add your first court or pitch above.
              </Text>
            </Card>
          ) : null}
          {venue.spaces.map((s) => (
            <Card key={s.id}>
              <Text style={styles.heading}>
                {s.areaName ? `${s.areaName} · ` : ""}
                {s.name}
              </Text>
              <Text style={styles.text}>
                {s.sport} · {s.playFormat || "Format not set"} ·{" "}
                {s.isIndoor ? "Indoor" : "Outdoor"} · {s.status}
              </Text>
              <View style={styles.row}>
                <Action
                  title={`Edit ${s.name}`}
                  secondary
                  disabled={busy || uploading}
                  onPress={() => editSpace(s)}
                />
                <Action
                  title={`Add slot for ${s.name}`}
                  disabled={busy || uploading}
                  onPress={() => {
                    setScrollSignal((n) => n + 1);
                    setSpace(null);
                    setSlot({ ...blankSlot, courtId: s.id });
                    setSlotId(undefined);
                    setError(null);
                  }}
                />
                <Action
                  title={`Remove ${s.name}`}
                  danger
                  disabled={busy || uploading}
                  onPress={() => {
                    setConfirm({ type: "space", id: s.id, name: s.name });
                    setScrollSignal((n) => n + 1);
                  }}
                />
              </View>
              {venue.slots
                .filter((t) => t.courtId === s.id)
                .map((t) => (
                  <View key={t.id} style={styles.slotDivider}>
                    <Text style={styles.text}>{slotLabel(t)} PKT</Text>
                    <Text style={styles.heading}>
                      PKR {t.price.toLocaleString()} · {t.status}
                      {Date.parse(t.startsAt) <= Date.now() ? " · Expired" : ""}
                    </Text>
                    <View style={styles.row}>
                      <Action
                        title="Edit slot"
                        secondary
                        disabled={busy || uploading}
                        onPress={() => {
                          setScrollSignal((n) => n + 1);
                          const local = new Date(
                            Date.parse(t.startsAt) + 5 * 3600000,
                          ).toISOString();
                          const end = new Date(
                            Date.parse(t.endsAt) + 5 * 3600000,
                          ).toISOString();
                          setSlot({
                            courtId: s.id,
                            date: local.slice(0, 10),
                            startTime: local.slice(11, 16),
                            endTime: end.slice(11, 16),
                            price: String(t.price),
                            status: t.status,
                            bookingEnabled: t.bookingEnabled ?? false,
                            paymentPolicy: t.paymentPolicy || "FULL_ONLY",
                            advancePercent: t.advancePercent ?? 25,
                            cancelBeforeHours: t.cancelBeforeHours ?? 24,
                            cancellationRefund: t.cancellationRefund || "FULL",
                          });
                          setSlotId(t.id);
                          setSpace(null);
                          setError(null);
                        }}
                      />
                      <Action
                        title="Remove slot"
                        danger
                        disabled={busy || uploading}
                        onPress={() => {
                          setConfirm({
                            type: "slot",
                            id: t.id,
                            name: "this slot",
                          });
                          setScrollSignal((n) => n + 1);
                        }}
                      />
                    </View>
                  </View>
                ))}
              {!venue.slots.some((t) => t.courtId === s.id) ? (
                <Text style={styles.text}>No dated availability added.</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Page>
  );
}
