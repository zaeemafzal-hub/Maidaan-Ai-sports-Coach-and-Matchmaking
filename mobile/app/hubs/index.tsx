import React from "react";
import { useLocalSearchParams } from "expo-router";
import VenueDirectory from "../../components/venues/VenueDirectory";
export default function HubDirectory() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return <VenueDirectory initialView={view === "map" ? "Map" : "List"} />;
}
