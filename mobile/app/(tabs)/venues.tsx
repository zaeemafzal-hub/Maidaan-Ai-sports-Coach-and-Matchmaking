import React from "react";
import { useLocalSearchParams } from "expo-router";
import VenueDirectory from "../../components/venues/VenueDirectory";
export default function VenuesScreen() {
  const { view, sport } = useLocalSearchParams<{
    view?: string;
    sport?: string;
  }>();
  return (
    <VenueDirectory
      tabbed
      initialView={view === "Map" ? "Map" : "List"}
      initialSport={sport}
    />
  );
}
