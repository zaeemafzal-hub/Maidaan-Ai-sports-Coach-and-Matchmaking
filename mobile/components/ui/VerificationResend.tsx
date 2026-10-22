import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "../theme/Primitives";
import { authService } from "../../services/authService";

export function VerificationResend({ email }: { email: string }) {
  const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!remaining) return;
    const timeout = setTimeout(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timeout);
  }, [remaining]);
  const resend = async () => {
    if (sending || remaining) return;
    setSending(true);
    setMessage("");
    try {
      await authService.resendVerificationEmail(email);
      setRemaining(60);
      setMessage(
        "If this address needs verification, a new link has been sent. Check your inbox and spam folder.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send a link. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <View className="my-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resend verification email"
        disabled={sending || remaining > 0}
        onPress={resend}
        className="min-h-[44px] justify-center items-center"
      >
        <Text className="text-[#E85D26] text-sm font-semibold">
          {sending
            ? "Sending..."
            : remaining
              ? `Resend in ${remaining}s`
              : "Resend verification email"}
        </Text>
      </Pressable>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-[#A0A5AD] text-xs text-center leading-5"
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
