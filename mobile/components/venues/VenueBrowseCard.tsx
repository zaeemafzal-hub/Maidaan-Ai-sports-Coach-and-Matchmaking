import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS, RADIUS } from "../../constants/theme";

export function VenueBrowseCard() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Browse hubs, prices & available slots"
      onPress={() => router.push("/hubs" as any)}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: COLORS.surfaceHighlight },
      ]}
    >
      <View style={styles.icon}>
        <Ionicons
          name="business-outline"
          size={22}
          color={COLORS.brandPrimary}
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>Explore sports hubs</Text>
        <Text style={styles.caption}>
          Browse courts, available slots and prices
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.brandPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  caption: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
});
