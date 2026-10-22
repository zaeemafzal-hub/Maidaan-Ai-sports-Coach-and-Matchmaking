import { ThemedScreen } from "../../components/ui/ThemedScreen";
import { ArtworkHero, ArtworkScrollView } from "../../components/ui/Artwork";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "../../components/theme/Primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { MatchFixtureCard } from "../../components/ui/MatchFixtureCard";
import { VenueBrowseCard } from "../../components/venues/VenueBrowseCard";
import { SkeletonCard } from "../../components/ui/SkeletonCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { MatchSlotItem } from "../../constants/matches";
import { Sport } from "../../types";
import { weatherService, WeatherOutlook } from "../../services/weatherService";
import { WeatherCompactBar } from "../../components/ui/WeatherCompactBar";
import { matchService } from "../../services/matchService";
import {GuideButton} from '../../components/guide/AppGuide';
import {AppearanceButton} from '../../components/theme/AppearanceControls';

type SportFilter = "ALL" | "CRICKET" | "BADMINTON" | "PADEL" | "FOOTBALL";

interface SportFilterConfig {
  key: SportFilter;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const SPORT_FILTERS: SportFilterConfig[] = [
  { key: "ALL", label: "All Sports", icon: "trophy-outline" },
  { key: "CRICKET", label: "Cricket", icon: "cricket" },
  { key: "FOOTBALL", label: "Football", icon: "soccer" },
  { key: "PADEL", label: "Padel", icon: "tennis" },
  { key: "BADMINTON", label: "Badminton", icon: "badminton" },
];

const getSportIcon = (
  sport: Sport,
): "cricket" | "badminton" | "tennis" | "soccer" => {
  switch (sport) {
    case "cricket":
      return "cricket";
    case "badminton":
      return "badminton";
    case "padel":
      return "tennis";
    case "football":
    default:
      return "soccer";
  }
};

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 960;
  const [activeSport, setActiveSport] = useState<SportFilter>("ALL");
  const [matches, setMatches] = useState<MatchSlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherOutlook | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);

  const loadWeather = React.useCallback(async () => {
    try {
      if (isMountedRef.current) setWeatherLoading(true);
      const data = await weatherService.getWeather({
        area: "Lahore",
        sport: activeSport !== "ALL" ? activeSport.toLowerCase() : undefined,
      });
      if (isMountedRef.current) {
        setWeather(data);
      }
    } catch {
      // Non-critical: leaves weather state null, fallback rendered gracefully
    } finally {
      if (isMountedRef.current) {
        setWeatherLoading(false);
      }
    }
  }, [activeSport]);

  const loadMatches = React.useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      const data = await matchService.getMatches();
      if (isMountedRef.current) {
        setMatches(data || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.warn("[DiscoverScreen] Failed to load matches:", err);
        setError(
          "Unable to sync match fixtures from server. Please check your connection.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      isMountedRef.current = true;
      loadMatches();
      loadWeather();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadMatches, loadWeather]),
  );

  const filteredMatches = matches.filter((m) => {
    if (activeSport === "ALL") return true;
    return m.sport.toUpperCase() === activeSport;
  });

  const handleMatchPress = (matchId: string) => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    router.push(`/match/${matchId}`);
  };

  const handleNotifications = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    router.push("/notifications");
  };

  const handleProfilePress = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    router.push("/(tabs)/profile");
  };

  return (
    <ThemedScreen style={ui.page} edges={["top"]}>
      <ArtworkScrollView
        kind="discover"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 22,
          paddingBottom: Math.max(insets.bottom, 16) + 30,
          gap: 26,
        }}
      >
        <View style={ui.topbar}>
          <View style={ui.location}>
            <Ionicons name="location-outline" size={16} color="#E85D26" />
            <Text style={ui.locationText}>Lahore, Pakistan</Text>
          </View>
          <View style={ui.actions}>
            <AppearanceButton />
            <GuideButton compact />
            <Pressable
              onPress={handleNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={ui.round}
            >
              <Ionicons name="notifications-outline" size={19} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={handleProfilePress}
              accessibilityRole="button"
              accessibilityLabel="My Profile"
              style={ui.round}
            >
              <Ionicons name="person-outline" size={19} color="#E85D26" />
            </Pressable>
          </View>
        </View>
        <ArtworkHero
          kind="discover"
          eyebrow="Make time for your game"
          title="Find your next great game."
          subtitle="Find your people. Get back to playing."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Your Assistant"
          onPress={() => router.push("/concierge")}
          style={[ui.concierge, { borderColor: "rgba(232,93,38,0.45)", padding: 18 }]}
        >
          <Ionicons name="sparkles" size={26} color="#E85D26" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[ui.conciergeTitle, { fontSize: 18 }]}>Your Assistant</Text>
            <Text style={ui.caption}>Find a game, explore venues or ask for help.</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#E85D26" />
        </Pressable>
        <View
          style={{
            flexDirection: wide ? "row" : "column",
            gap: 28,
            alignItems: "stretch",
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
            <View style={ui.headingRow}>
              <Text style={ui.heading}>Matches near you</Text>
              <Text style={ui.count}>{filteredMatches.length} fixtures</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {SPORT_FILTERS.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeSport === item.key }}
                  accessibilityLabel={"Filter sport: " + item.label}
                  onPress={() => setActiveSport(item.key)}
                  style={[ui.filter, activeSport === item.key && ui.selected]}
                >
                  <Text
                    style={[
                      ui.filterText,
                      activeSport === item.key && { color: "#0C0D0E" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {isLoading ? (
              <View style={{ gap: 14 }}>
                <SkeletonCard height={170} />
                <SkeletonCard height={170} />
              </View>
            ) : error ? (
              <EmptyState
                title="Failed to Sync Matches"
                description={error}
                actionTitle="Retry Sync"
                onAction={loadMatches}
                iconName="cloud-offline-outline"
              />
            ) : !filteredMatches.length ? (
              <EmptyState
                title="No Matches Found"
                description={
                  matches.length
                    ? "Try another sport filter or show all matches."
                    : "No open fixtures are scheduled yet. Check back soon."
                }
                actionTitle="Show All Matches"
                onAction={() => setActiveSport("ALL")}
                iconName="filter-outline"
              />
            ) : (
              filteredMatches.map((m, index) => (
                <MatchFixtureCard
                  key={m.id}
                  title={m.title}
                  sport={m.sportLabel}
                  sportIcon={getSportIcon(m.sport)}
                  date={m.date}
                  time={m.time}
                  groundName={m.groundName}
                  area={m.area}
                  slotsOpen={m.slotsOpen}
                  totalSlots={m.totalSlots}
                  skillLevel={m.skillLevel}
                  pricePerPlayer={m.feePerPlayer}
                  captainName={m.captainName}
                  isFeatured={index === 0 && m.slotsOpen <= 2}
                  onPress={() => handleMatchPress(m.id)}
                />
              ))
            )}
          </View>
          <View style={{ width: wide ? 310 : "100%", gap: 16 }}>
            <Text style={ui.heading}>Your next court</Text>
            <VenueBrowseCard />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to Map View"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/venues",
                  params: {
                    view: "Map",
                    sport:
                      activeSport === "ALL" ? "All" : activeSport.toLowerCase(),
                  },
                })
              }
              style={ui.mapAction}
            >
              <Ionicons name="map-outline" size={18} color="#FF986B" />
              <Text style={ui.mapText}>Explore venues on the map</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF986B" />
            </Pressable>
            <WeatherCompactBar weather={weather} loading={weatherLoading} />

          </View>
        </View>
      </ArtworkScrollView>
    </ThemedScreen>
  );
}
const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  location: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,21,24,.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  heading: {
    fontSize: 20,
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  count: { color: "#FF986B", fontSize: 11 },
  filter: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
    backgroundColor: "rgba(20,21,24,.35)",
  },
  selected: { backgroundColor: "#E85D26", borderColor: "#E85D26" },
  filterText: { color: "#E2E3E6", fontSize: 12, fontWeight: "700" },
  mapAction: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
    backgroundColor: "rgba(20,21,24,.24)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mapText: { color: "#FFF", flex: 1, fontSize: 12, fontWeight: "600" },
  concierge: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "rgba(20,21,24,.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  conciergeTitle: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  caption: { color: "#D4D7DC", fontSize: 12 },
});
