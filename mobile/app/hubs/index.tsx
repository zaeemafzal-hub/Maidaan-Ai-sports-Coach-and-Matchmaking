import React, { useCallback, useState } from "react";
import { Text } from "react-native";
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
export default function HubDirectory() {
  const [hubs, setHubs] = useState<Venue[]>([]),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [sport, setSport] = useState("All"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      venueService
        .browse(sport === "All" ? "" : sport, term)
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
    }, [sport, term, reload]),
  );
  return (
    <Page title="Sports hubs">
      <Text style={styles.title}>Find your next playing space.</Text>
      <Text style={styles.text}>
        Explore venues, photos, facilities and available slots with prices.
      </Text>
      <FormInput
        label="Search name or location"
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
        label="Sport"
        options={["All", ...SPORTS]}
        value={sport}
        onChange={setSport}
      />
      <Notice error={error} />
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
            <Text style={styles.text}>{hub.location}</Text>
            <Text style={styles.text}>
              {hub.sports.join(" · ")} ·{" "}
              {hub.isVerified ? "Verified venue" : "Verification pending"}
            </Text>
            <Text style={styles.text}>
              {
                hub.slots.filter(
                  (s) =>
                    !sport ||
                    sport === "All" ||
                    hub.spaces.find((c) => c.id === s.courtId)?.sport === sport,
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
    </Page>
  );
}
