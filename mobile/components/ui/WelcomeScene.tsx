import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ARTWORK } from "../../constants/artwork";

export default function WelcomeScene() {
  const [pressedAction, setPressedAction] = React.useState<'start' | 'login' | null>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(0);
  useFocusEffect(
    React.useCallback(() => {
      lift.value = 0;
      if (!reducedMotion)
        lift.value = withRepeat(
          withTiming(-8, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        );
      return () => cancelAnimation(lift);
    }, [lift, reducedMotion]),
  );
  const floating = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));
  const art = (
    <Animated.View
      pointerEvents="none"
      style={[
        s.art,
        {
          width: wide ? "54%" : "100%",
          height: wide ? 540 : Math.min(width * 0.8, 340),
        },
        floating,
      ]}
    >
      <Image
        source={ARTWORK.welcome}
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
        accessible={false}
      />
    </Animated.View>
  );
  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.content}>
          <View style={s.header}>
            <Text style={s.brand}>
              Ma<Text style={s.orange}>i</Text>daan
            </Text>
            <Text style={s.label}>PLAY. CONNECT. GROW.</Text>
          </View>
          <View
            style={[
              s.main,
              wide && { flexDirection: "row", alignItems: "center", gap: 24 },
            ]}
          >
            {!wide && art}
            <View
              style={[
                s.copy,
                {
                  width: wide ? "44%" : "100%",
                  paddingHorizontal: wide ? 0 : 26,
                },
              ]}
            >
              <Text style={s.eyebrow}>A PLACE FOR EVERY PLAYER</Text>
              <Text
                style={[
                  s.headline,
                  {
                    fontSize: wide ? 62 : width < 360 ? 33 : 40,
                    lineHeight: wide ? 66 : width < 360 ? 38 : 44,
                  },
                ]}
              >
                Less scrolling.{"\n"}More <Text style={s.orange}>playing.</Text>
              </Text>
              <Text style={s.subtitle}>
                Find a match. Book your next court.{"\n"}Build your game with an
                AI coach.
              </Text>
              <View style={s.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Get Started"
                  onPress={() => router.push("/(auth)/create-account")}
                  onPressIn={() => setPressedAction('start')}
                  onPressOut={() => setPressedAction(null)}
                  style={[
                    s.button,
                    pressedAction === 'start' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={s.primaryText}>Get started ↗</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log In"
                  onPress={() => router.push("/(auth)/login")}
                  onPressIn={() => setPressedAction('login')}
                  onPressOut={() => setPressedAction(null)}
                  style={[
                    s.button,
                    s.secondary,
                    pressedAction === 'login' && { opacity: 0.85 },
                  ]}
                >
                  <Text style={s.secondaryText}>I already have an account</Text>
                </Pressable>
              </View>
              <Text style={s.sports}>
                Cricket · Football · Padel · Badminton
              </Text>
            </View>
            {wide && art}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0C0D0E" },
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
    paddingVertical: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 26,
    gap: 20,
  },
  brand: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1.5,
  },
  orange: { color: "#E85D26" },
  label: {
    color: "#A0A5AD",
    fontSize: 9,
    letterSpacing: 1,
    maxWidth: 105,
    textAlign: "right",
  },
  main: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  art: { overflow: "visible" },
  copy: { gap: 16 },
  eyebrow: {
    color: "#FF986B",
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  headline: { color: "#FFF", fontWeight: "800", letterSpacing: -1.3 },
  subtitle: { color: "#BFC4CC", fontSize: 14, lineHeight: 23 },
  actions: { gap: 12, width: "100%", maxWidth: 380, marginTop: 8 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#E85D26",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#1B1D22",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
  },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  sports: { color: "#A0A5AD", fontSize: 11, marginTop: 6 },
});
