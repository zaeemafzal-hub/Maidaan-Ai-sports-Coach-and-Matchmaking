import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { getBaseUrl } from "../../services/api";
import { VenueMapProps } from "./VenueMap.types";
import { handleMapMessage, mapData } from "./mapMessages";
import { styles } from "../venues/VenueUI";
export default function OpenVenueMap(props: VenueMapProps) {
  const frame = useRef<HTMLIFrameElement>(null),
    callbacks = useRef(props),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  callbacks.current = props;
  useEffect(() => {
    if (error) callbacks.current.onUnavailable?.();
  }, [error]);
  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(
      () => callbacks.current.onUnavailable?.(),
      20000,
    );
    return () => clearTimeout(timeout);
  }, [ready]);
  const url = getBaseUrl() + "/maps/view";
  useEffect(() => {
    const origin = new URL(url, window.location.href).origin;
    const listener = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === origin
      )
        handleMapMessage(
          event.data,
          callbacks.current,
          () => setReady(true),
          setError,
        );
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [url]);
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        mapData(props),
        new URL(url, window.location.href).origin,
      );
  }, [
    ready,
    props.points,
    props.center?.latitude,
    props.center?.longitude,
    !!props.onPick,
    url,
  ]);
  return (
    <View style={{ gap: 8 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <iframe
        ref={frame}
        title="OpenStreetMap venue map"
        src={url}
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ height: 330, width: "100%", border: 0, borderRadius: 16 }}
        onError={() =>
          setError(
            "Unable to load OpenStreetMap. Check your connection or choose Google Maps.",
          )
        }
      />
    </View>
  );
}
