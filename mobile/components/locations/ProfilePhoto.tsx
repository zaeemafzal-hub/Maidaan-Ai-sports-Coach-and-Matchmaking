import React, { useState } from "react";
import { Image, Text, View } from "../theme/Primitives";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../services/api";
import { responseData } from "../../services/venueService";
import { Action, styles } from "../venues/VenueUI";
export function ProfilePhoto({
  url,
  onChange,
  onBusyChange,
}: {
  url: string;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function pick() {
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo.base64 || (photo.fileSize || 0) > 5242880)
        throw new Error("Choose a photo smaller than 5 MB.");
      onChange(
        responseData(
          await api.post<{ url: string }>("/api/profile/player/photo", {
            base64: photo.base64,
          }),
        ).url,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload photo.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Profile photo (optional)</Text>
      {url ? (
        <Image
          source={{ uri: url }}
          accessibilityLabel="Your profile photo"
          style={{ width: 88, height: 88, borderRadius: 44 }}
        />
      ) : null}
      <Action
        title={
          busy
            ? "Uploading…"
            : url
              ? "Change profile photo"
              : "Add profile photo"
        }
        secondary
        disabled={busy}
        onPress={pick}
      />
      {url ? (
        <Action
          title="Remove profile photo"
          secondary
          disabled={busy}
          onPress={() => onChange("")}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
