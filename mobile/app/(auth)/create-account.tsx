import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { completeSignIn } from "../../services/completeSignIn";
import { authService } from "../../services/authService";
import { FormInput } from "../../components/ui/FormInput";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { IMAGES } from "../../constants/images";

export default function CreateAccountScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
      nextErrors.fullName = "Full name is required";
    } else if (trimmedName.length < 2) {
      nextErrors.fullName = "Name must be at least 2 characters";
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = "Email address is required";
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }

    if (!acceptedTerms) {
      nextErrors.terms =
        "You must agree to the Terms of Service and Privacy Policy to continue";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (isSubmitting || !validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await authService.register({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: "PLAYER",
      });

      if (result.needsEmailConfirmation) {
        setShowConfirmation(true);
        return;
      }

      router.replace(await completeSignIn());
    } catch (err: any) {
      setErrors({
        general: err?.message || "Failed to create account. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (isSubmitting) return;
    if (!acceptedTerms) {
      setErrors({ terms: "Please accept the community terms to continue." });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await authService.signInWithGoogle();
      if (result.success) router.replace(await completeSignIn());
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Google sign-in failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  if (showConfirmation) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ArenaHeader
          title="Account Verification"
          subtitle="Email Confirmation"
          showBack
          fallbackRoute="/(auth)/welcome"
          onBack={() => setShowConfirmation(false)}
        />
        <View className="flex-1 px-5 justify-center items-center">
          <View className="w-16 h-16 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 items-center justify-center mb-5">
            <Ionicons name="mail-unread" size={32} color="#E85D26" />
          </View>
          <Text className="text-brand-primary text-xs font-bold uppercase tracking-wider mb-1.5">
            Email Confirmation Required
          </Text>
          <Text className="text-white text-2xl font-bold text-center mb-2 tracking-tight">
            Check Your Inbox
          </Text>
          <Text className="text-[#A0A5AD] text-sm text-center font-normal leading-relaxed mb-4 max-w-xs">
            We sent a verification link to:
          </Text>
          <View className="px-4 py-2 bg-[#141518]/25 border border-white/[0.08] rounded-xl mb-6">
            <Text className="text-white text-xs font-semibold">{email}</Text>
          </View>
          <Text className="text-[#5C616A] text-xs text-center font-normal leading-relaxed mb-8 max-w-xs">
            Please confirm your email address by clicking the link, then sign in
            to complete your profile setup.
          </Text>
          <View className="w-full max-w-xs">
            <PrimaryButton
              title="Proceed to Sign In"
              onPress={handleLogin}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ArenaHeader
        title="Create Account"
        subtitle="Join the Arena"
        showBack
        fallbackRoute="/(auth)/welcome"
        rightAction={
          <Pressable
            onPress={handleLogin}
            className="py-1.5 px-3 rounded-full bg-brand-primary/15 border border-brand-primary/30"
          >
            <Text className="text-brand-primary text-xs font-semibold uppercase tracking-wider">
              Log In
            </Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ThemedScroll
          kind="form"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Upper Hero Sports Photography */}
          <View className="h-44 w-full relative bg-[#141518]/25 overflow-hidden">
            <Image
              source={IMAGES.arenaOnboard}
              className="w-full h-full object-cover"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-[#0C0D0E]/60" />

            <View className="absolute bottom-4 left-5 right-5">
              <View className="flex-row items-center self-start px-2.5 py-0.5 rounded-full bg-brand-primary/15 border border-brand-primary/30 mb-1.5">
                <Text className="text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                  Athlete Account
                </Text>
              </View>
              <Text className="text-white text-2xl font-bold tracking-tight">
                Create Your Account
              </Text>
            </View>
          </View>

          {/* Form Content */}
          <View className="px-5 pt-5 pb-6">
            {errors.general && (
              <View className="mb-4 p-3.5 rounded-xl bg-error/15 border border-error/30">
                <Text className="text-error text-xs font-medium text-center">
                  {errors.general}
                </Text>
              </View>
            )}

            <View className="space-y-4">
              <FormInput
                label="Full Name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName)
                    setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="e.g. Zaeem Chaudhary"
                error={errors.fullName}
                testID="signup-name-input"
              />

              <FormInput
                label="Email Address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="player@maidaan.pk"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                testID="signup-email-input"
              />

              <FormInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                error={errors.password}
                testID="signup-password-input"
                rightElement={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="p-1"
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#A0A5AD"
                    />
                  </Pressable>
                }
              />
            </View>

            {/* Terms and Conditions Checkbox */}
            <Pressable
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                if (errors.terms)
                  setErrors((prev) => ({ ...prev, terms: undefined }));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              accessibilityLabel="Accept Terms of Service and Privacy Policy"
              className="flex-row items-start mt-4 mb-2 active:opacity-80"
            >
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center mt-0.5 mr-3 ${
                  acceptedTerms
                    ? "bg-brand-primary border-brand-primary"
                    : "border-white/[0.08] bg-[#141518]/25"
                }`}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>

              <Text className="text-[#A0A5AD] text-xs leading-relaxed flex-1 font-normal">
                I agree to the Maidaan Fair Play Code of Conduct, Rules of Play,
                and Community Terms.
              </Text>
            </Pressable>

            {errors.terms && (
              <Text className="text-error text-xs font-medium mb-2 ml-8">
                {errors.terms}
              </Text>
            )}

            {/* Submit Button */}
            <View className="mt-6">
              <PrimaryButton
                title="Create Account"
                onPress={handleCreateAccount}
                loading={isSubmitting}
                variant="primary"
                size="lg"
                testID="create-account-button"
              />

              <View className="mt-3">
                <PrimaryButton
                  title="Continue with Google"
                  onPress={handleGoogleSignup}
                  disabled={isSubmitting}
                  variant="secondary"
                  testID="signup-google-button"
                />
              </View>

              <Pressable
                onPress={handleLogin}
                className="w-full py-4 items-center justify-center mt-3 active:opacity-75 min-h-[44px]"
                accessibilityRole="button"
                accessibilityLabel="Already registered? Log in"
              >
                <Text className="text-[#5C616A] text-sm font-medium">
                  Already have an account?{" "}
                  <Text className="text-brand-primary font-semibold">
                    Log In
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ThemedScroll>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
