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

export default function CreateAccountScreen() {
  const { selectedRole, setCurrentUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    terms?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      nextErrors.fullName = 'Full name is required';
    } else if (trimmedName.length < 2) {
      nextErrors.fullName = 'Name must be at least 2 characters';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (!acceptedTerms) {
      nextErrors.terms =
        'You must agree to the Terms of Service and Privacy Policy to continue';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validate()) {
      return;
    }

    if (!selectedRole) {
      setErrors({
        general: 'Please select a role before creating your account.',
      });
      router.push('/(auth)/role-selection');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await authService.register({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
      });

      setCurrentUser(result.user);

      switch (selectedRole) {
        case 'PLAYER':
          router.replace('/onboarding/player-setup');
          break;
        case 'TEAM_CAPTAIN':
          router.replace('/onboarding/captain-setup');
          break;
        case 'HUB_OWNER':
          router.replace('/onboarding/hub-setup');
          break;
        default:
          router.push('/(auth)/role-selection');
          break;
      }
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Failed to create account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      <ArenaHeader
        title="MAIDAAN"
        subtitle="REGISTRATION"
        showBack
        rightAction={
          <Pressable onPress={handleLogin} className="py-1 px-2.5">
            <Text className="text-olive text-xs font-black uppercase tracking-wider">
              LOG IN
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
          {/* Upper 35% Hero Sports Photography */}
          <View className="h-44 w-full relative bg-graphite overflow-hidden">
            <Image
              source={IMAGES.arenaOnboard}
              className="w-full h-full object-cover"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-graphite/40" />

            <View className="absolute bottom-3 left-6 right-6">
              <View className="flex-row items-center self-start px-2 py-0.5 rounded-sm bg-graphite/90 border border-stone/30 mb-1">
                <Text className="text-warm-white text-[10px] font-bold uppercase tracking-wider">
                  ROLE: {selectedRole || 'PLAYER'}
                </Text>
              </View>
              <Text className="text-warm-white text-2xl font-black uppercase tracking-tight">
                Create Your Account
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
                label="FULL NAME"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="e.g. Zaeem Chaudhary"
                error={errors.fullName}
                testID="signup-name-input"
              />

              <FormInput
                label="EMAIL ADDRESS"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="player@maidaan.pk"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                testID="signup-email-input"
              />

              <FormInput
                label="PASSWORD"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                error={errors.password}
                testID="signup-password-input"
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

            {/* Terms and Conditions Checkbox */}
            <Pressable
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              accessibilityLabel="Accept Terms of Service and Privacy Policy"
              className="flex-row items-start mt-4 mb-2 active:opacity-80"
            >
              <View
                className={`w-5 h-5 rounded-sm border items-center justify-center mt-0.5 mr-3 ${
                  acceptedTerms ? 'bg-olive border-olive' : 'border-stone bg-warm-white'
                }`}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={14} color="#F4F1EA" />
                )}
              </View>

              <Text className="text-stone-muted text-xs leading-relaxed flex-1 font-medium">
                I agree to the Maidaan Match-Day Code of Conduct, Rules of Play, and Community Terms.
              </Text>
            </Pressable>

            {errors.terms && (
              <Text className="text-rust text-xs font-semibold mb-2 ml-8">
                {errors.terms}
              </Text>
            )}

            {/* Submit Button */}
            <View className="mt-5">
              <PrimaryButton
                title="ENTER THE ARENA"
                onPress={handleCreateAccount}
                loading={isSubmitting}
                variant="primary"
                testID="create-account-button"
              />

              <Pressable
                onPress={handleLogin}
                className="w-full py-3.5 items-center justify-center mt-3 active:opacity-70 min-h-[44px]"
                accessibilityRole="button"
                accessibilityLabel="Already registered? Log in"
              >
                <Text className="text-stone-muted text-xs font-bold uppercase tracking-wider">
                  ALREADY ON THE BOARD?{' '}
                  <Text className="text-graphite underline font-black">LOG IN</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
