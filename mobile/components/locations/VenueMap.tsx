import React, { useState } from "react";
import { View, Text } from "../theme/Primitives";
import { styles } from "../venues/VenueUI";
import { VenueMapProps } from "./VenueMap.types";
import GoogleVenueMap from "./GoogleVenueMap";
import OpenVenueMap from "./OpenVenueMap";
export default function VenueMap(props: VenueMapProps) {
  const [useBackup, setUseBackup] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      {!useBackup ? (
        <OpenVenueMap {...props} onUnavailable={() => setUseBackup(true)} />
      ) : (
        <>
          <Text style={styles.text}>
            OpenStreetMap is unavailable. Using the backup map.
          </Text>
          <GoogleVenueMap {...props} />
        </>
      )}
    </View>
  );
}
