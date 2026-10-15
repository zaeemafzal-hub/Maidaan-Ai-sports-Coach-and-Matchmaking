import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IMAGES } from '../../constants/images';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    router.push('/(auth)/role-selection');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-[#0C0D0E]">
      {/* Full-Bleed Athletic Hero Photography (Cricket, Football, Padel) */}
      <Image
        source={IMAGES.welcomeAthletes}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Cinematic Vignette Overlays for Depth and Text Legibility */}
      <View style={styles.topVignette} pointerEvents="none" />
      <View style={styles.bottomGradient} pointerEvents="none" />
      <View style={styles.solidBottomBase} pointerEvents="none" />

      {/* Responsive Content Container */}
      <View
        className="flex-1 justify-between px-6"
        style={{
          paddingTop: Math.max(insets.top, 16) + 6,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        {/* Top Centered Brand Title matching Reference Phone Mockup */}
        <View className="items-center pt-3">
          <View className="flex-row items-center justify-center">
            <Text
              style={styles.brandText}
              className="text-white text-4xl tracking-tight"
            >
              Ma<Text style={{ color: '#E85D26' }}>i</Text>daan
            </Text>
          </View>
        </View>

        {/* Lower Content & Actions Section */}
        <View className="w-full items-center">
          {/* Centered Headline */}
          <Text
            style={{ color: '#FFFFFF' }}
            className="text-white text-3xl font-black tracking-tight text-center"
          >
            Your Arena Awaits.
          </Text>

          {/* Centered Supporting Copy */}
          <Text
            style={{ color: '#A0A5AD' }}
            className="text-[#A0A5AD] text-sm text-center mt-2.5 max-w-[280px] leading-relaxed font-medium"
          >
            Find local matches, join squads,{'\n'}and train with AI.
          </Text>

          {/* Action Buttons Stack */}
          <View className="w-full mt-7" style={{ gap: 12 }}>
            {/* Primary Action Button: Solar Orange with Glow */}
            <Pressable
              onPress={handleGetStarted}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
              className="w-full py-4 rounded-full bg-[#E85D26] items-center justify-center active:scale-[0.98] shadow-lg shadow-[#E85D26]/40"
            >
              <Text
                style={{ color: '#0C0D0E' }}
                className="text-[#0C0D0E] text-base font-extrabold tracking-wide"
              >
                Get Started
              </Text>
            </Pressable>

            {/* Secondary Action Button: Frosted Glass Log In */}
            <Pressable
              onPress={handleLogin}
              accessibilityRole="button"
              accessibilityLabel="Log In"
              className="w-full py-4 rounded-full bg-white/[0.12] border border-white/[0.18] items-center justify-center active:scale-[0.98] active:bg-white/[0.16]"
            >
              <Text
                style={{ color: '#FFFFFF' }}
                className="text-white text-base font-bold tracking-wide"
              >
                Log In
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandText: {
    fontStyle: 'italic',
    fontWeight: '900',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(12, 13, 14, 0.45)',
  },
  bottomGradient: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 13, 14, 0.78)',
  },
  solidBottomBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor: '#0C0D0E',
    opacity: 0.94,
  },
});
