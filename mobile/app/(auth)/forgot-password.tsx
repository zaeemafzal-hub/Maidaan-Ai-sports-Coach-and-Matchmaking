import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../../components/ui/FormInput';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ArenaHeader } from '../../components/ui/ArenaHeader';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = (): boolean => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError('Email address is required');
      return false;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return false;
    }

    setError(undefined);
    return true;
  };

  const handleSendResetLink = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsSubmitted(true);
    } catch {
      setError('Unable to process recovery request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top', 'bottom']}>
      <ArenaHeader
        title="Reset Password"
        subtitle="Account Recovery"
        showBack
        fallbackRoute="/(auth)/login"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="px-5 py-6"
        >
          {isSubmitted ? (
            /* Success confirmation card */
            <View className="p-6 rounded-2xl bg-[#141518] border border-white/[0.08] shadow-md my-auto">
              <View className="w-14 h-14 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 items-center justify-center mb-4">
                <Ionicons name="mail-open-outline" size={28} color="#E85D26" />
              </View>

              <Text className="text-white text-2xl font-bold tracking-tight">
                Reset Link Sent
              </Text>

              <Text className="text-[#A0A5AD] text-sm leading-relaxed mt-2 font-normal">
                We sent password reset instructions to{' '}
                <Text className="text-brand-primary font-semibold">{email}</Text>. Check your email inbox and follow the secure link to reset your password.
              </Text>

              <View className="mt-6">
                <PrimaryButton
                  title="Return to Sign In"
                  onPress={handleBackToLogin}
                  variant="primary"
                  size="lg"
                />
              </View>
            </View>
          ) : (
            /* Request Form */
            <View className="flex-1 justify-between">
              <View>
                <View className="mb-6">
                  <Text className="text-white text-2xl font-bold tracking-tight">
                    Reset Password
                  </Text>
                  <Text className="text-[#A0A5AD] text-sm mt-2 leading-relaxed">
                    Enter the email registered with your account. We will dispatch a recovery reset link.
                  </Text>
                </View>

                <FormInput
                  label="Registered Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(undefined);
                  }}
                  placeholder="athlete@maidaan.pk"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={error}
                  testID="forgot-password-email-input"
                />
              </View>

              <View className="pt-6 pb-4">
                <PrimaryButton
                  title="Send Reset Link"
                  onPress={handleSendResetLink}
                  loading={isSubmitting}
                  variant="primary"
                  size="lg"
                />

                <Pressable
                  onPress={handleBack}
                  className="w-full py-4 items-center justify-center mt-3 active:opacity-75 min-h-[44px]"
                >
                  <Text className="text-[#5C616A] text-sm font-medium">
                    Remember your password?{' '}
                    <Text className="text-brand-primary font-semibold">Sign In</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
