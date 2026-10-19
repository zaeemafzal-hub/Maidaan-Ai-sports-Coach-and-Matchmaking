import { ArtworkHero } from "../ui/Artwork";
import React, { useCallback, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
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
import { LocationFields } from "../locations/LocationFields";
import VenueMap from "../locations/VenueMap";
import { locationService, ServiceCity } from "../../services/locationService";
const blank: VenueInput = {
  name: "",
  location: "",
  contactNumber: "",
  sports: ["cricket"],
  description: "",
  latitude: null,
  longitude: null,
  photoUrls: [],
  cityId: "lahore",
  areaId: "",
};
export default function VenueEditor() {
  const wide = useWindowDimensions().width >= 960;
  const roles = useAuthStore((s) => s.roles),
    id = useAuthStore((s) => s.currentUser?.id);
  const [form, setForm] = useState(blank),
    [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState("");
  const [cities, setCities] = useState<ServiceCity[]>([]);
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
      Promise.all([venueService.own(), locationService.cities()])
        .then(([hub, availableCities]) => {
          if (active) {
            setCities(availableCities);
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
    if (!form.areaId) {
      setError("Select the city and area for your venue.");
      return;
    }
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
    <Page
      title="Venue details & photos"
      footer={
        !loading ? (
          <View style={{ gap: 8 }}>
            {saved ? (
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                Venue details saved.
              </Text>
            ) : null}
            <Action
              title={busy ? "Saving…" : "Save venue details"}
              disabled={busy || uploading}
              onPress={save}
            />
          </View>
        ) : undefined
      }
    >
      <ArtworkHero
        kind="form"
        eyebrow="Make a great first impression"
        title="A home for your hub."
        subtitle="Give players everything they need to find you and book confidently."
      />
      <Notice error={error} />
      {loading ? (
        <Busy />
      ) : (
        <>
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              gap: 20,
              alignItems: "stretch",
            }}
          >
            <View
              style={{
                flex: wide ? 1 : undefined,
                width: wide ? undefined : "100%",
                minWidth: 0,
                gap: 20,
              }}
            >
              <Card heading="The essentials" step="01">
                <FormInput
                  label="Venue name"
                  value={form.name}
                  onChangeText={(v) => change("name", v)}
                />
                <LocationFields
                  cityId={form.cityId || "lahore"}
                  areaId={form.areaId || ""}
                  onChange={(cityId, areaId) => {
                    setForm((current) => ({ ...current, cityId, areaId }));
                    setSaved(false);
                  }}
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
              <Card heading="Sports offered" step="02">
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
            </View>
            <View
              style={{
                flex: wide ? 1 : undefined,
                width: wide ? undefined : "100%",
                minWidth: 0,
                gap: 20,
              }}
            >
              <Card heading="Map location" step="03">
                <Text style={styles.text}>
                  Tap the map to place your venue entrance. Only venues with an
                  exact pin appear on the map. The address and area remain
                  searchable without a pin.
                </Text>
                <VenueMap
                  center={cities.find(
                    (city) => city.id === (form.cityId || "lahore"),
                  )}
                  points={
                    latitude.trim() &&
                    longitude.trim() &&
                    Number.isFinite(Number(latitude)) &&
                    Number.isFinite(Number(longitude))
                      ? [
                          {
                            id: "venue",
                            title: form.name || "Your venue",
                            latitude: Number(latitude),
                            longitude: Number(longitude),
                          },
                        ]
                      : []
                  }
                  onPick={(lat, lng) => {
                    setLatitude(lat.toFixed(6));
                    setLongitude(lng.toFixed(6));
                    setSaved(false);
                  }}
                />
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
              <Card heading="Venue gallery" step="04">
                <PhotoEditor
                  urls={form.photoUrls}
                  onChange={(v) => change("photoUrls", v)}
                  onBusyChange={setUploading}
                />
              </Card>
            </View>
          </View>

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
