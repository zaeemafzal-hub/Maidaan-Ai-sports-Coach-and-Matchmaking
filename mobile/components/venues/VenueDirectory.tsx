import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "../theme/Primitives";
import { router, useFocusEffect } from "expo-router";
import { FormInput } from "../../components/ui/FormInput";
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
import { Venue, SPORTS } from "../../types/venue";
import { venueService } from "../../services/venueService";
import { LocationFields } from "../../components/locations/LocationFields";
import VenueMap from "../../components/locations/VenueMap";
import { locationService, ServiceCity } from "../../services/locationService";
import { ArtworkHero, ArtworkScrollView } from "../ui/Artwork";
export default function VenueDirectory({
  embedded = false,
  initialView = "List",
  sportFilter,
  initialSport,
  tabbed = false,
  initialSearch = '',
}: {
  embedded?: boolean;
  initialView?: string;
  sportFilter?: string;
  initialSport?: string;
  tabbed?: boolean;
  initialSearch?: string;
}) {
  const [areaQuery, setAreaQuery] = useState(""),
    [areaTerm, setAreaTerm] = useState("");
  const [cityId, setCityId] = useState("lahore"),
    [areaId, setAreaId] = useState(""),
    [view, setView] = useState(initialView),
    [cities, setCities] = useState<ServiceCity[]>([]);
  const [hubs, setHubs] = useState<Venue[]>([]),
    [search, setSearch] = useState(initialSearch),
    [term, setTerm] = useState(initialSearch.trim()),
    [sport, setSport] = useState(
      initialSport && SPORTS.includes(initialSport as any)
        ? initialSport
        : "All",
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const selectedSport = sportFilter ?? sport;
  useEffect(() => {setSearch(initialSearch);setTerm(initialSearch.trim());}, [initialSearch]);
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  useEffect(() => {
    if (initialSport)
      setSport(SPORTS.includes(initialSport as any) ? initialSport : "All");
  }, [initialSport]);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const timer = setTimeout(() => setAreaTerm(areaQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [areaQuery]);
  useEffect(() => {
    let active = true;
    locationService
      .cities()
      .then((data) => {
        if (active) setCities(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const points = useMemo(
    () =>
      hubs
        .filter((h) => h.latitude != null && h.longitude != null)
        .map((h) => ({
          id: h.id,
          title: h.name,
          latitude: h.latitude!,
          longitude: h.longitude!,
        })),
    [hubs],
  );
  const city = cities.find((c) => c.id === cityId);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      venueService
        .browse(
          selectedSport === "All" ? "" : selectedSport,
          term,
          cityId,
          areaId,
          areaTerm,
        )
        .then((v) => {
          if (active) setHubs(v);
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
    }, [selectedSport, term, reload, cityId, areaId, areaTerm]),
  );
  const content = (
    <>
      <ArtworkHero
        kind="venues"
        eyebrow="Your game starts here"
        title="Find your court."
        subtitle="Explore venues, photos, facilities and available slots with prices."
      />
      <Card heading="Find a venue">
        <LocationFields
          cityId={cityId}
          areaId={areaId}
          allowAll
          onQueryChange={setAreaQuery}
          onChange={(city, area) => {
            setCityId(city);
            setAreaId(area);
          }}
        />
        <FormInput
          label="Search venue name or address"
          value={search}
          onChangeText={setSearch}
        />
        <Action
          title="Search hubs"
          onPress={() => {
            setTerm(search.trim());
            setReload((n) => n + 1);
          }}
        />
        <Choices
          label="View"
          options={["List", "Map"]}
          value={view}
          onChange={setView}
        />
        {!sportFilter ? (
          <Choices
            label="Sport"
            options={["All", ...SPORTS]}
            value={sport}
            onChange={setSport}
          />
        ) : null}
      </Card>
      <Notice error={error} />
      {!loading && !error && view === "Map" ? (
        <>
          <VenueMap
            points={points}
            center={
              city
                ? { latitude: city.latitude, longitude: city.longitude }
                : undefined
            }
            onSelect={(id) => router.push(`/hubs/${id}` as any)}
          />
          <Text style={styles.text}>
            {points.length} of {hubs.length} venues have exact map pins. All
            matching venues appear below.
          </Text>
        </>
      ) : null}
      {error ? (
        <Action
          title="Retry loading hubs"
          secondary
          onPress={() => setReload((n) => n + 1)}
        />
      ) : null}
      {loading ? (
        <Busy />
      ) : !error && !hubs.length ? (
        <Card>
          <Text style={styles.text}>No hubs match this search yet.</Text>
        </Card>
      ) : !error ? (
        hubs.map((hub) => (
          <Card key={hub.id}>
            <Gallery urls={hub.photoUrls.slice(0, 1)} />
            <Text style={styles.heading}>{hub.name}</Text>
            <Text style={styles.text}>
              {[hub.areaLabel, hub.cityName].filter(Boolean).join(", ")}
            </Text>
            <Text style={styles.text}>{hub.location}</Text>
            <Text style={styles.text}>
              {hub.sports.join(" · ")} ·{" "}
              {hub.isVerified ? "Verified venue" : "Verification pending"}
            </Text>
            <Text style={styles.text}>
              {
                hub.slots.filter(
                  (s) =>
                    !selectedSport ||
                    selectedSport === "All" ||
                    hub.spaces.find((c) => c.id === s.courtId)?.sport ===
                      selectedSport,
                ).length
              }{" "}
              upcoming slots
            </Text>
            <Action
              title={`View ${hub.name}`}
              onPress={() => router.push(`/hubs/${hub.id}` as any)}
            />
          </Card>
        ))
      ) : null}
    </>
  );
  return embedded ? (
    <ArtworkScrollView
      kind="venues"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      {content}
    </ArtworkScrollView>
  ) : (
    <Page
      title="Sports hubs"
      artwork="venues"
      tabbed={tabbed}
      showBack={!tabbed}
    >
      {content}
    </Page>
  );
}
