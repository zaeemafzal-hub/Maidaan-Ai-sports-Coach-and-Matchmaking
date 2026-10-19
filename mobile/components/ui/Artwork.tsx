import React, { forwardRef } from "react";
import {
  Image,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ARTWORK, ArtworkKind } from "../../constants/artwork";

export function ArtworkBackground({
  kind,
  dim = 0.72,
  zoom = false,
}: {
  kind: ArtworkKind;
  dim?: number;
  zoom?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={ARTWORK[kind]}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          { width: "100%", height: "100%" },
          zoom && { width: "180%", left: "-80%" },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(12,13,14,${dim})` },
        ]}
      />
    </View>
  );
}
// The artwork belongs to the content and scrolls naturally behind the cards.
export const ArtworkScrollView = forwardRef<
  ScrollView,
  ScrollViewProps & { kind: ArtworkKind; maxWidth?: number }
>(function ArtworkScrollView(
  { kind, maxWidth = 1180, children, contentContainerStyle, ...props },
  ref,
) {
  return (
    <ScrollView {...props} ref={ref} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1, width: "100%" }}>
        <ArtworkBackground kind={kind} />
        <View
          style={[
            { width: "100%", maxWidth, alignSelf: "center" },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </ScrollView>
  );
});
export function ArtworkHero({
  kind,
  eyebrow,
  title,
  subtitle,
}: {
  kind: ArtworkKind;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const wide = useWindowDimensions().width >= 900;
  return (
    <View style={[art.hero, { minHeight: wide ? 210 : 180 }]}>
      <ArtworkBackground kind={kind} dim={0.4} zoom={kind === "discover"} />
      <Text style={art.eyebrow}>{eyebrow}</Text>
      <Text
        style={[
          art.title,
          { fontSize: wide ? 40 : 29, lineHeight: wide ? 44 : 34 },
        ]}
      >
        {title}
      </Text>
      <Text style={art.subtitle}>{subtitle}</Text>
    </View>
  );
}
const art = StyleSheet.create({
  hero: {
    padding: 24,
    justifyContent: "center",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(232,93,38,.25)",
    gap: 10,
  },
  eyebrow: {
    color: "#FF986B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textShadowColor: "#000",
    textShadowRadius: 8,
  },
  title: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: -0.9,
    textShadowColor: "#000",
    textShadowRadius: 10,
  },
  subtitle: {
    color: "#E2E3E6",
    fontSize: 13,
    lineHeight: 20,
    textShadowColor: "#000",
    textShadowRadius: 8,
    maxWidth: 500,
  },
});
