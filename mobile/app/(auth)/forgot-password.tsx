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
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      <ArenaHeader title="MAIDAAN" subtitle="ACCOUNT RECOVERY" showBack fallbackRoute="/(auth)/login" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="px-6 py-6"
        >
          {isSubmitted ? (
            /* Success confirmation card */
            <View className="p-6 rounded-xl bg-warm-white border border-stone shadow-sm my-auto">
              <View className="w-14 h-14 rounded-xl bg-olive items-center justify-center mb-4">
                <Ionicons name="mail-open-outline" size={28} color="#F4F1EA" />
              </View>

              <Text className="text-graphite text-2xl font-black uppercase tracking-tight">
                Reset Link Sent
              </Text>

              <Text className="text-stone-muted text-sm leading-relaxed mt-2 font-medium">
                We sent password reset instructions to{' '}
                <Text className="text-graphite font-bold">{email}</Text>. Check your email inbox and follow the secure link to update your credentials.
              </Text>

              <View className="mt-6">
                <PrimaryButton
                  title="RETURN TO LOG IN"
                  onPress={handleBackToLogin}
                  variant="primary"
                />
              </View>
            </View>
          ) : (
            /* Request Form */
            <View className="flex-1 justify-between">
              <View>
                <View className="mb-6">
                  <Text className="text-graphite text-2xl font-black uppercase tracking-tight">
                    Reset Password
                  </Text>
                  <Text className="text-stone-muted text-xs font-semibold uppercase tracking-wide mt-1.5 leading-relaxed">
                    Enter the email registered with your athlete profile. We will dispatch a recovery reset link.
                  </Text>
                </View>

                <FormInput
                  label="REGISTERED EMAIL"
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

              <View className="pt-6 pb-2">
                <PrimaryButton
                  title="SEND RESET LINK"
                  onPress={handleSendResetLink}
                  loading={isSubmitting}
                  variant="primary"
                />

                <Pressable
                  onPress={handleBack}
                  className="w-full py-3.5 items-center justify-center mt-2.5 active:opacity-70 min-h-[44px]"
                >
                  <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                    REMEMBER YOUR PASSWORD?{' '}
                    <Text className="text-graphite underline font-black">LOG IN</Text>
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
