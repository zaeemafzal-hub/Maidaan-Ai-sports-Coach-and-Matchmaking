import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { WebView } from "react-native-webview";
import { getBaseUrl } from "../../services/api";
import { VenueMapProps } from "./VenueMap.types";
import { handleMapMessage, mapData } from "./mapMessages";
import { styles } from "../venues/VenueUI";
export default function OpenVenueMap(props: VenueMapProps) {
  const ref = useRef<WebView>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const unavailable = useRef(props.onUnavailable);
  unavailable.current = props.onUnavailable;
  useEffect(() => {
    if (error) unavailable.current?.();
  }, [error]);
  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(() => unavailable.current?.(), 20000);
    return () => clearTimeout(timeout);
  }, [ready]);
  useEffect(() => {
    if (ready)
      ref.current?.injectJavaScript(
        `window.maidaanMapUpdate&&window.maidaanMapUpdate(${JSON.stringify(mapData(props)).replace(/</g, "\\u003c")});true;`,
      );
  }, [
    ready,
    props.points,
    props.center?.latitude,
    props.center?.longitude,
    !!props.onPick,
  ]);
  return (
    <View style={{ gap: 8 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: 330, borderRadius: 16, overflow: "hidden" }}>
        <WebView
          ref={ref}
          source={{ uri: getBaseUrl() + "/maps/view" }}
          applicationNameForUserAgent="Maidaan/1.0"
          cacheEnabled
          javaScriptEnabled
          domStorageEnabled
          onLoadStart={() => {
            setReady(false);
            setError("");
          }}
          onError={() =>
            setError(
              "Unable to load OpenStreetMap. Check your connection or choose Google Maps.",
            )
          }
          onHttpError={() => setError("Unable to load the map page.")}
          onMessage={(event) => {
            try {
              handleMapMessage(
                JSON.parse(event.nativeEvent.data),
                props,
                () => setReady(true),
                setError,
              );
            } catch {}
          }}
          onShouldStartLoadWithRequest={(request) =>
            request.url === getBaseUrl() + "/maps/view" ||
            request.url === "about:blank"
          }
        />
      </View>
    </View>
  );
}
