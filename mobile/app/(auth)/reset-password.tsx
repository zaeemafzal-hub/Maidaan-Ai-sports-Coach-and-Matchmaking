import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "../../components/theme/Primitives";

import { router } from "expo-router";
import { Ionicons } from "../../components/theme/Icons";
import { FormInput } from "../../components/ui/FormInput";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { authService } from "../../services/authService";
import {isStrongPassword, PASSWORD_HELP} from '../../utils/passwordPolicy';
import {PasswordRequirements} from '../../components/ui/PasswordRequirements';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    if (!newPassword) {
      setError("New password is required");
      return false;
    }

    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_HELP);
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    setError(undefined);
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      await authService.updatePassword(newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to update password. Please try again or request a new reset link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ArenaHeader
        title="New Password"
        subtitle="Security Update"
        showBack
        fallbackRoute="/(auth)/login"
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
          className="px-5 py-6"
        >
          {isSuccess ? (
            /* Success confirmation card */
            <View className="p-6 rounded-2xl bg-[#141518]/25 border border-white/[0.08] shadow-md my-auto">
              <View className="w-14 h-14 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 items-center justify-center mb-4">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={28}
                  color="#22C55E"
                />
              </View>

              <Text className="text-white text-2xl font-bold tracking-tight">
                Password Updated
              </Text>

              <Text className="text-[#A0A5AD] text-sm mt-2 leading-relaxed">
                Your password has been successfully updated. You can now use
                your new password to sign into Maidaan.
              </Text>

              <View className="mt-6">
                <PrimaryButton
                  title="Sign In"
                  onPress={handleBackToLogin}
                  variant="primary"
                  size="lg"
                  testID="reset-success-login-button"
                />
              </View>
            </View>
          ) : (
            /* Reset password form */
            <View className="my-auto">
              <View className="mb-6">
                <Text className="text-white text-2xl font-bold tracking-tight">
                  Create New Password
                </Text>
                <Text className="text-[#A0A5AD] text-sm mt-2 leading-relaxed">
                  {PASSWORD_HELP}
                </Text>
              </View>

              {error && (
                <View className="mb-4 p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30">
                  <Text className="text-[#EF4444] text-xs font-medium text-center">
                    {error}
                  </Text>
                </View>
              )}

              <View className="space-y-4">
                <FormInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (error) setError(undefined);
                  }}
                  placeholder="Choose a strong password"
                  secureTextEntry={!showPassword}
                  testID="reset-new-password-input"
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

                <PasswordRequirements password={newPassword} />
                <FormInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (error) setError(undefined);
                  }}
                  placeholder="Re-enter your new password"
                  secureTextEntry={!showPassword}
                  testID="reset-confirm-password-input"
                />
              </View>

              <View className="mt-8 space-y-3">
                <PrimaryButton
                  title="Update Password"
                  onPress={handleUpdatePassword}
                  loading={isSubmitting}
                  variant="primary"
                  size="lg"
                  testID="reset-submit-button"
                />

                <Pressable
                  onPress={handleBackToLogin}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel and return to Sign In"
                  className="w-full py-3 items-center justify-center min-h-[44px]"
                >
                  <Text className="text-[#A0A5AD] text-sm font-medium">
                    Cancel and Return to Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ThemedScroll>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}
