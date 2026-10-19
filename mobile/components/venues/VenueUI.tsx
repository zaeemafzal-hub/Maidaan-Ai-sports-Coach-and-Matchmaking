import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ArenaHeader } from "../ui/ArenaHeader";
import { venueService } from "../../services/venueService";
import { COLORS, RADIUS } from "../../constants/theme";
import { ArtworkScrollView } from "../ui/Artwork";
import { ArtworkKind, GLASS_CARD } from "../../constants/artwork";

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  content: {
    padding: 20,
    paddingBottom: 50,
    gap: 16,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
  },
  card: {
    padding: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: GLASS_CARD.backgroundColor,
    borderWidth: 1,
    borderColor: GLASS_CARD.borderColor,
    gap: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: -0.3,
  },
  heading: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  text: { color: "#D4D7DC", fontSize: 13, lineHeight: 20 },
  error: { color: COLORS.error, fontSize: 13, lineHeight: 20 },
  label: {
    color: COLORS.textLightSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  button: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
  },
  danger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  slotDivider: {
    gap: 8,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 12,
  },
  photo: {
    width: 240,
    height: 155,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
  },
});
export function Page({
  title,
  children,
  scrollSignal = 0,
  artwork = "form",
  showBack = true,
  tabbed = false,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  scrollSignal?: number;
  artwork?: ArtworkKind;
  showBack?: boolean;
  tabbed?: boolean;
  footer?: React.ReactNode;
}) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollSignal) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [scrollSignal]);
  return (
    <SafeAreaView
      style={styles.page}
      edges={tabbed ? ["top"] : ["top", "bottom"]}
    >
      <ArenaHeader
        title={title}
        showBack={showBack}
        fallbackRoute="/(tabs)/discover"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ArtworkScrollView
          kind={artwork}
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {children}
        </ArtworkScrollView>
        {footer ? (
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              backgroundColor: COLORS.canvas,
            }}
          >
            <View
              style={{ width: "100%", maxWidth: 1060, alignSelf: "center" }}
            >
              {footer}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  heading,
  step,
}: {
  children: React.ReactNode;
  heading?: string;
  step?: string;
}) {
  return (
    <View style={styles.card}>
      {heading ? (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          {step ? (
            <Text
              style={{
                color: COLORS.brandPrimary,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {step}
            </Text>
          ) : null}
          <Text style={styles.heading}>{heading}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
export function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && styles.danger,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { fontWeight: "600" },
          danger && { color: COLORS.error },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option }}
            onPress={() => onChange(option)}
            style={[
              styles.button,
              option !== value && styles.secondary,
              { paddingHorizontal: 16, paddingVertical: 10, minHeight: 42 },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                option !== value && {
                  color: COLORS.textSecondary,
                  fontWeight: "600",
                },
              ]}
            >
              {option.replace(/_/g, " ")}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Notice({ error }: { error: string | null }) {
  return error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  ) : null;
}
export function Busy() {
  return (
    <ActivityIndicator
      color={COLORS.brandPrimary}
      accessibilityLabel="Loading"
    />
  );
}
export function Gallery({ urls }: { urls: string[] }) {
  return urls.length ? (
    <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
      {urls.map((uri, i) => (
        <Image
          key={uri}
          source={{ uri }}
          accessibilityLabel={`Venue photo ${i + 1}`}
          style={styles.photo}
        />
      ))}
    </ScrollView>
  ) : (
    <Text style={styles.text}>No photos added yet.</Text>
  );
}
export function PhotoEditor({
  urls,
  onChange,
  onBusyChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function pick() {
    setError(null);
    setBusy(true);
    onBusyChange?.(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo.base64 || (photo.fileSize || 0) > 5242880)
        throw new Error("Choose a JPEG, PNG or WebP photo smaller than 5 MB.");
      const url = await venueService.uploadPhoto(photo.base64);
      onChange([...urls, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.text}>
        Photos ({urls.length}/6) · first photo is the cover
      </Text>
      <Gallery urls={urls} />
      <View style={styles.row}>
        {urls.map((uri, i) => (
          <Action
            key={uri}
            title={`Remove photo ${i + 1}`}
            secondary
            disabled={busy}
            onPress={() => onChange(urls.filter((u) => u !== uri))}
          />
        ))}
      </View>
      <Notice error={error} />
      <Action
        title={busy ? "Uploading…" : "Add photo"}
        secondary
        disabled={busy || urls.length >= 6}
        onPress={pick}
      />
    </View>
  );
}
