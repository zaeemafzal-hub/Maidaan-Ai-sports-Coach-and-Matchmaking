import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { authService } from '../../services/authService';
import { completeSignIn } from '../../services/completeSignIn';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackScreen() {
  const callbackUrl = Linking.useLinkingURL();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        const url = Platform.OS === 'web' ? window.location.href : callbackUrl || await Linking.getInitialURL();
        const result = url ? await authService.handleAuthCallbackUrl(url) : null;
        if (!result?.access_token) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('The sign-in link is missing or expired. Please sign in again.');
        }
        if (!active) return;
        if (Platform.OS === 'web') window.history.replaceState(null, '', window.location.pathname);
        if (result?.type === 'recovery') {
          router.replace('/(auth)/reset-password');
        } else {
          const destination = await completeSignIn();
          if (active) router.replace(destination);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      }
    };
    void finish();
    return () => { active = false; };
  }, [callbackUrl]);

  return (
    <View className="flex-1 bg-[#0C0D0E] items-center justify-center px-6">
      {error ? (
        <>
          <Text accessibilityRole="alert" className="text-white text-center mb-5">{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} className="bg-[#E85D26] rounded-xl p-4">
            <Text className="text-white font-bold">Back to Sign In</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color="#E85D26" />
          <Text className="text-white mt-4">Completing sign-in…</Text>
        </>
      )}
    </View>
  );
}
