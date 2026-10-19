import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { VenueMapProps } from "./VenueMap.types";
export default function VenueMap({
  points,
  center = { latitude: 31.5204, longitude: 74.3587 },
  onSelect,
  onPick,
}: VenueMapProps) {
  const ref = useRef<MapView>(null);
  useEffect(() => {
    if (points.length > 1)
      ref.current?.fitToCoordinates(points, {
        edgePadding: { top: 45, bottom: 45, left: 35, right: 35 },
        animated: true,
      });
    else
      ref.current?.animateToRegion(
        {
          ...(points[0] || center),
          latitudeDelta: points.length ? 0.04 : 0.22,
          longitudeDelta: points.length ? 0.04 : 0.22,
        },
        300,
      );
  }, [points, center.latitude, center.longitude]);
  return (
    <View style={{ height: 330, borderRadius: 16, overflow: "hidden" }}>
      <MapView
        ref={ref}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={{ ...center, latitudeDelta: 0.22, longitudeDelta: 0.22 }}
        onPress={(event) => {
          if (onPick && event.nativeEvent.action !== "marker-press")
            onPick(
              event.nativeEvent.coordinate.latitude,
              event.nativeEvent.coordinate.longitude,
            );
        }}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={point}
            title={point.title}
            pinColor="#E85D26"
            onPress={() => onSelect?.(point.id)}
          />
        ))}
      </MapView>
    </View>
  );
}
