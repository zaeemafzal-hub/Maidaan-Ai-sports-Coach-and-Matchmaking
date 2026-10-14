import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { FormInput } from '../../components/ui/FormInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { IMAGES } from '../../constants/images';

export default function LoginScreen() {
  const {
    selectedRole,
    currentUser,
    onboardingCompleted,
    setCurrentUser,
    setSelectedRole,
    setOnboardingCompleted,
    setPlayerProfile,
    setCaptainProfile,
    setHubOwnerProfile,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      setCurrentUser(result.user);
      setSelectedRole(result.user.role);
      const isComplete = (result.user as any).onboardingCompleted ?? false;
      setOnboardingCompleted(isComplete);

      if (result.profile) {
        if (result.user.role === 'PLAYER') {
          setPlayerProfile(result.profile);
        } else if (result.user.role === 'TEAM_CAPTAIN') {
          setCaptainProfile(result.profile);
        } else if (result.user.role === 'HUB_OWNER') {
          setHubOwnerProfile(result.profile);
        }
      }

      if (isComplete) {
        if (result.user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/(tabs)/discover');
        }
      } else {
        switch (result.user.role) {
          case 'PLAYER':
            router.replace('/onboarding/player-setup');
            break;
          case 'TEAM_CAPTAIN':
            router.replace('/onboarding/captain-setup');
            break;
          case 'HUB_OWNER':
            router.replace('/onboarding/hub-setup');
            break;
          case 'ADMIN':
            router.replace('/admin/dashboard');
            break;
          default:
            router.replace('/onboarding/player-setup');
            break;
        }
      }
    } catch (err: any) {
      setErrors({ general: err?.message || 'Invalid email or password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialMockLogin = (provider: 'Google' | 'Apple') => {
    const role = currentUser?.role || selectedRole || 'PLAYER';
    const user: User = {
      id: `usr_${provider.toLowerCase()}_${Date.now()}`,
      name: `${provider} Athlete`,
      email: `${provider.toLowerCase()}.user@maidaan.pk`,
      role,
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(user);

    if (onboardingCompleted) {
      router.replace('/(tabs)/discover');
    } else {
      router.replace('/onboarding/player-setup');
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/role-selection');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      <ArenaHeader
        title="MAIDAAN"
        subtitle="MATCH-DAY SIGN IN"
        showBack
        rightAction={
          <Pressable onPress={handleRegister} className="py-1 px-2.5">
            <Text className="text-olive text-xs font-black uppercase tracking-wider">
              REGISTER
            </Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Photography */}
          <View className="h-40 w-full relative bg-graphite overflow-hidden">
            <Image
              source={IMAGES.arenaMatch}
              className="w-full h-full object-cover"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-graphite/45" />

            <View className="absolute bottom-3 left-6 right-6">
              <Text className="text-stone text-[10px] font-black uppercase tracking-wider mb-0.5">
                FIXTURE CHECK-IN
              </Text>
              <Text className="text-warm-white text-2xl font-black uppercase tracking-tight">
                Welcome Back
              </Text>
            </View>
          </View>

          {/* Form Content */}
          <View className="px-6 pt-5 pb-6">
            {errors.general && (
              <View className="mb-4 p-3 rounded-lg bg-rust/15 border border-rust">
                <Text className="text-rust text-xs font-bold text-center">
                  {errors.general}
                </Text>
              </View>
            )}

            <View className="space-y-4">
              <FormInput
                label="EMAIL ADDRESS"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="athlete@maidaan.pk"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                testID="login-email-input"
              />

              <FormInput
                label="PASSWORD"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                error={errors.password}
                testID="login-password-input"
                rightElement={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    className="p-1"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#666B60"
                    />
                  </Pressable>
                }
              />
            </View>

            {/* Forgot Password Link */}
            <View className="items-end mt-2.5 mb-5">
              <Pressable
                onPress={handleForgotPassword}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                className="py-1 px-1"
              >
                <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                  FORGOT PASSWORD?
                </Text>
              </Pressable>
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title="LOG IN TO THE ARENA"
              onPress={handleLogin}
              loading={isSubmitting}
              variant="primary"
              testID="login-submit-button"
            />

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-stone" />
              <Text className="mx-3 text-stone-muted text-[11px] font-bold uppercase tracking-wider">
                OR QUICK ACCESS
              </Text>
              <View className="flex-1 h-[1px] bg-stone" />
            </View>

            {/* Social Logins */}
            <View className="space-y-2.5">
              <Pressable
                onPress={() => handleSocialMockLogin('Google')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl border border-stone bg-warm-white flex-row items-center justify-center active:bg-stone-light"
              >
                <Ionicons name="logo-google" size={18} color="#242522" />
                <Text className="text-graphite text-xs font-bold uppercase tracking-wider ml-2.5">
                  Continue with Google
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSocialMockLogin('Apple')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl border border-stone bg-warm-white flex-row items-center justify-center active:bg-stone-light mt-2.5"
              >
                <Ionicons name="logo-apple" size={18} color="#242522" />
                <Text className="text-graphite text-xs font-bold uppercase tracking-wider ml-2.5">
                  Continue with Apple
                </Text>
              </Pressable>
            </View>

            {/* Bottom Register Redirect */}
            <Pressable
              onPress={handleRegister}
              className="w-full py-4 items-center justify-center mt-4 active:opacity-70 min-h-[44px]"
              accessibilityRole="button"
              accessibilityLabel="New player? Register"
            >
              <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                NEW TO MAIDAAN?{' '}
                <Text className="text-graphite underline font-black">
                  CHOOSE YOUR ROLE & JOIN
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
