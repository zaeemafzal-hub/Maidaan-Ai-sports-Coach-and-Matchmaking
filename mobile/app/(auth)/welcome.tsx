import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IMAGES } from '../../constants/images';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push('/(auth)/role-selection');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-graphite">
      {/* Full-Bleed Atmospheric Sports Photography */}
      <ImageBackground
        source={IMAGES.arenaSplash}
        style={styles.heroImage}
        resizeMode="cover"
      >
        {/* Controlled Graphite Overlays & Vignette */}
        <View style={styles.topVignette} />
        <View style={styles.bottomSolidOverlay} />

        <SafeAreaView className="flex-1 justify-between px-6 pt-4 pb-6">
          {/* Top Brand Header */}
          <View className="items-center pt-2">
            <View className="flex-row items-center justify-center">
              <Text className="text-warm-white text-3xl font-black tracking-widest uppercase">
                MAIDAAN
              </Text>
            </View>

            {/* Match-Day Sub-Header Badge */}
            <View className="flex-row items-center mt-2 px-3 py-1 rounded-sm bg-graphite/90 border border-stone/30">
              <Text className="text-stone text-[10px] font-bold tracking-[0.2em] uppercase">
                LOCAL ARENAS • EVENING MATCHES • TEAMS
              </Text>
            </View>
          </View>

          {/* Hero Content Section */}
          <View className="w-full">
            {/* Sports Strip Indicator */}
            <View className="flex-row items-center self-start px-3 py-1 rounded-sm bg-graphite/95 border border-stone/40 mb-3.5">
              <View className="w-2 h-2 rounded-full bg-rust mr-2" />
              <Text className="text-stone text-[11px] font-bold tracking-wider uppercase">
                FOOTBALL • CRICKET • PADEL • BADMINTON
              </Text>
            </View>

            {/* Athletic Headline */}
            <Text className="text-warm-white text-4xl font-black tracking-tight leading-[1.08] uppercase">
              Your next game is closer than you think.
            </Text>

            {/* Supporting Copy */}
            <Text className="text-stone text-sm leading-relaxed mt-3 pr-2 font-medium">
              Join neighborhood matches under floodlights, reserve local grounds, organize teams, and step onto the pitch.
            </Text>

            {/* Bottom Actions */}
            <View className="w-full mt-7 space-y-3">
              <PrimaryButton
                title="Get started"
                onPress={handleGetStarted}
                variant="primary"
              />

              <Pressable
                onPress={handleLogin}
                className="w-full py-3 items-center justify-center active:opacity-70 min-h-[44px]"
                accessibilityRole="button"
                accessibilityLabel="I already have an account"
              >
                <Text className="text-stone text-xs font-bold uppercase tracking-wider">
                  I ALREADY HAVE AN ACCOUNT{' '}
                  <Text className="text-warm-white font-black underline">LOG IN</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 37, 34, 0.45)',
  },
  bottomSolidOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.62,
    backgroundColor: 'rgba(36, 37, 34, 0.88)',
  },
});
