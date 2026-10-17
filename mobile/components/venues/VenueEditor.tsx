import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import { FormInput } from "../ui/FormInput";
import {
  Page,
  Card,
  Action,
  Notice,
  Busy,
  PhotoEditor,
  styles,
} from "./VenueUI";
import { VenueInput, SPORTS } from "../../types/venue";
import { venueService } from "../../services/venueService";
const blank: VenueInput = {
  name: "",
  location: "",
  contactNumber: "",
  sports: ["cricket"],
  description: "",
  latitude: null,
  longitude: null,
  photoUrls: [],
};
export default function VenueEditor() {
  const roles = useAuthStore((s) => s.roles),
    id = useAuthStore((s) => s.currentUser?.id);
  const [form, setForm] = useState(blank),
    [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const allowed = roles.includes("HUB_OWNER");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) return;
      setLoading(true);
      setError(null);
      venueService
        .own()
        .then((hub) => {
          if (active) {
            setForm(hub);
            setLatitude(hub.latitude == null ? "" : String(hub.latitude));
            setLongitude(hub.longitude == null ? "" : String(hub.longitude));
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
  function change<K extends keyof VenueInput>(key: K, value: VenueInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }
  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await venueService.saveVenue({
        ...form,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
      });
      await useAuthStore.getState().loadProfile();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save venue.");
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <Page title="Venue details">
        <Text style={styles.text}>A hub owner account is required.</Text>
      </Page>
    );
  return (
    <Page title="Venue details & photos">
      <Text style={styles.title}>Make your venue easy to find.</Text>
      <Text style={styles.text}>
        Players and captains will see these details on your public hub page.
      </Text>
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : (
        <>
          <Card>
            <FormInput
              label="Venue name"
              value={form.name}
              onChangeText={(v) => change("name", v)}
            />
            <FormInput
              label="Street address / location"
              placeholder="Building, road, area and city"
              value={form.location}
              onChangeText={(v) => change("location", v)}
            />
            <FormInput
              label="Contact number"
              keyboardType="phone-pad"
              value={form.contactNumber}
              onChangeText={(v) => change("contactNumber", v)}
            />
            <FormInput
              label="About your venue"
              multiline
              numberOfLines={4}
              value={form.description}
              onChangeText={(v) => change("description", v)}
            />
          </Card>
          <Card>
            <Text style={styles.heading}>Sports offered</Text>
            <View style={styles.row}>
              {SPORTS.map((sport) => (
                <Action
                  key={sport}
                  title={sport}
                  secondary={!form.sports.includes(sport)}
                  onPress={() =>
                    change(
                      "sports",
                      form.sports.includes(sport)
                        ? form.sports.filter((s) => s !== sport)
                        : [...form.sports, sport],
                    )
                  }
                />
              ))}
            </View>
          </Card>
          <Card>
            <Text style={styles.heading}>Map location</Text>
            <Text style={styles.text}>
              Optional: copy coordinates from Google Maps for an exact pin.
              Leave both empty to use your street address.
            </Text>
            <FormInput
              label="Latitude"
              value={latitude}
              onChangeText={(v) => {
                setLatitude(v);
                setSaved(false);
              }}
              placeholder="31.5204"
            />
            <FormInput
              label="Longitude"
              value={longitude}
              onChangeText={(v) => {
                setLongitude(v);
                setSaved(false);
              }}
              placeholder="74.3587"
            />
          </Card>
          <Card>
            <PhotoEditor
              urls={form.photoUrls}
              onChange={(v) => change("photoUrls", v)}
              onBusyChange={setUploading}
            />
          </Card>
          {saved ? <Text style={styles.text}>Venue details saved.</Text> : null}
          <Action
            title={busy ? "Saving…" : "Save venue details"}
            disabled={busy || uploading}
            onPress={save}
          />
          <Action
            title="Playing spaces & availability"
            secondary
            onPress={() => router.push("/hub/courts")}
          />
          <Action
            title="Preview public venue"
            secondary
            onPress={() => router.push(`/hubs/${id}` as any)}
          />
        </>
      )}
    </Page>
  );
}
