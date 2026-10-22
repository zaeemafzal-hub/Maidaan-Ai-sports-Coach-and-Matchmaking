import React from "react";
import { useLocalSearchParams } from "expo-router";
import VenueDirectory from "../../components/venues/VenueDirectory";
export default function HubDirectory() {
  const { view, search } = useLocalSearchParams<{ view?: string; search?: string }>();
  return <VenueDirectory initialView={view === "map" ? "Map" : "List"} initialSearch={typeof search === 'string' ? search : ''} />;
}
