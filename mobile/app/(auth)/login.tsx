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
import { authService } from "../../services/authService";
import { FormInput } from "../../components/ui/FormInput";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { IMAGES } from "../../constants/images";
import { completeSignIn } from "../../services/completeSignIn";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      nextErrors.email = "Email address is required";
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (isSubmitting || !validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await authService.login({ email, password });
      router.replace(await completeSignIn());
    } catch (err: any) {
      setErrors({ general: err?.message || "Invalid email or password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await authService.signInWithGoogle();
      if (result.success) router.replace(await completeSignIn());
    } catch (err: any) {
      setErrors({ general: err?.message || "Google sign in failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleLogin = () => {
    if (Platform.OS !== "ios") {
      setErrors({
        general: "Apple Sign-In is only available on iOS devices.",
      });
      return;
    }
    setErrors({
      general:
        "Apple Sign-In requires an Apple Developer membership and configuration.",
    });
  };

  const handleForgotPassword = () => {
    router.push("/(auth)/forgot-password");
  };

  const handleRegister = () => {
    router.push("/(auth)/create-account");
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ArenaHeader
        title="Sign In"
        subtitle="Account Access"
        showBack
        fallbackRoute="/(auth)/welcome"
        rightAction={
          <Pressable
            onPress={handleRegister}
            className="py-1.5 px-3 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30"
          >
            <Text className="text-[#E85D26] text-xs font-bold uppercase tracking-wider">
              Register
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
          {/* Header Photography with Cinematic Overlay */}
          <View className="h-44 w-full relative bg-[#0C0D0E] overflow-hidden">
            <Image
              source={IMAGES.arenaMatch}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Cinematic multi-stop dark overlay */}
            <View className="absolute inset-0 bg-[#0C0D0E]/40" />
            <View className="absolute inset-x-0 bottom-0 h-24 bg-[#0C0D0E]/90" />

            <View className="absolute bottom-4 left-5 right-5">
              <View className="flex-row items-center mb-1">
                <View className="w-2 h-2 rounded-full bg-[#E85D26] mr-2 shadow-xs shadow-[#E85D26]" />
                <Text className="text-[#E85D26] text-[11px] font-bold uppercase tracking-wider">
                  Match-Day Access
                </Text>
              </View>
              <Text className="text-white text-2xl font-bold tracking-tight">
                Welcome Back
              </Text>
            </View>
          </View>

          {/* Form Content */}
          <View className="px-5 pt-5 pb-6">
            {errors.general && (
              <View className="mb-4 p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30">
                <Text className="text-[#EF4444] text-xs font-medium text-center">
                  {errors.general}
                </Text>
              </View>
            )}

            <View className="space-y-4">
              <FormInput
                label="Email Address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="athlete@maidaan.pk"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                testID="login-email-input"
              />

              <FormInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                error={errors.password}
                testID="login-password-input"
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

            {/* Forgot Password Link */}
            <View className="items-end mt-2 mb-6">
              <Pressable
                onPress={handleForgotPassword}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                className="py-1 px-1"
              >
                <Text className="text-[#A0A5AD] text-xs font-medium hover:text-[#E85D26]">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={isSubmitting}
              variant="primary"
              size="lg"
              testID="login-submit-button"
            />

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-[rgba(255,255,255,0.08)]" />
              <Text className="mx-3 text-[#5C616A] text-[10px] font-bold uppercase tracking-wider">
                Or Continue With
              </Text>
              <View className="flex-1 h-[1px] bg-[rgba(255,255,255,0.08)]" />
            </View>

            {/* Social Logins */}
            <View className="space-y-3">
              <Pressable
                onPress={handleGoogleLogin}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                disabled={isSubmitting}
                className="w-full min-h-[50px] py-3.5 px-4 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#141518]/25 flex-row items-center justify-center active:bg-[#1B1D22]"
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold ml-2.5">
                  Continue with Google
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAppleLogin}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                disabled={isSubmitting}
                className="w-full min-h-[50px] py-3.5 px-4 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#141518]/25 flex-row items-center justify-center active:bg-[#1B1D22] mt-2.5 opacity-80"
              >
                <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold ml-2.5">
                  Continue with Apple
                </Text>
              </Pressable>
            </View>

            {/* Bottom Register Redirect */}
            <Pressable
              onPress={handleRegister}
              className="w-full py-5 items-center justify-center mt-3 active:opacity-75 min-h-[44px]"
              accessibilityRole="button"
              accessibilityLabel="New player? Register"
            >
              <Text className="text-[#5C616A] text-sm font-medium">
                New to Maidaan?{" "}
                <Text className="text-[#E85D26] font-bold">
                  Create an Account
                </Text>
              </Text>
            </Pressable>
          </View>
        </ThemedScroll>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
