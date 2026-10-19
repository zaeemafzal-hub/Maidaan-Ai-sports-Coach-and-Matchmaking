import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { styles } from "../venues/VenueUI";
import { VenueMapProps } from "./VenueMap.types";
let mapsReady: Promise<void> | undefined;
function loadMaps(key: string) {
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (mapsReady) return mapsReady;
  mapsReady = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            "Google Maps did not load. Check your connection and Maps configuration.",
          ),
        ),
      20000,
    );
    (window as any).maidaanMapsReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    (window as any).gm_authFailure = () => {
      clearTimeout(timeout);
      reject(
        new Error(
          "Google Maps could not authorize this website. Check the browser key and allowed websites.",
        ),
      );
    };
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, v: "weekly", loading: "async", libraries: "marker", callback: "maidaanMapsReady" })}`;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Unable to load Google Maps. Check your connection."));
    };
    document.head.appendChild(script);
  });
  return mapsReady;
}
export default function VenueMap({
  points,
  center = { latitude: 31.5204, longitude: 74.3587 },
  onSelect,
  onPick,
}: VenueMapProps) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    markers = useRef<any[]>([]);
  const callbacks = useRef({ onSelect, onPick });
  callbacks.current = { onSelect, onPick };
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY;
  useEffect(() => {
    if (!key) return;
    let active = true;
    loadMaps(key)
      .then(() => {
        if (!active || !host.current) return;
        const google = (window as any).google;
        map.current = new google.maps.Map(host.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 12,
          mapId: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
          streetViewControl: false,
          mapTypeControl: false,
        });
        map.current.addListener("click", (event: any) => {
          if (event.latLng)
            callbacks.current.onPick?.(event.latLng.lat(), event.latLng.lng());
        });
        setReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      markers.current.forEach((marker) => (marker.map = null));
      if (map.current)
        (window as any).google?.maps.event.clearInstanceListeners(map.current);
      map.current = null;
    };
  }, [key]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const google = (window as any).google;
    markers.current.forEach((marker) => (marker.map = null));
    markers.current = points.map((point) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: map.current,
        position: { lat: point.latitude, lng: point.longitude },
        title: point.title,
      });
      marker.addListener("click", () => callbacks.current.onSelect?.(point.id));
      return marker;
    });
    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) =>
        bounds.extend({ lat: p.latitude, lng: p.longitude }),
      );
      map.current.fitBounds(bounds, 45);
    } else {
      map.current.setCenter({
        lat: points[0]?.latitude ?? center.latitude,
        lng: points[0]?.longitude ?? center.longitude,
      });
      map.current.setZoom(points.length ? 14 : 12);
    }
  }, [ready, points, center.latitude, center.longitude]);
  if (!key)
    return (
      <View style={styles.card}>
        <Text style={styles.text}>
          Google Maps is being configured. You can search areas and browse
          venues below.
        </Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.card}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  return (
    <div
      ref={host}
      aria-label="Venue map"
      style={{
        height: 330,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
      }}
    />
  );
}
