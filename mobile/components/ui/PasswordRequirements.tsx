import React from "react";
import { View, Text } from "../theme/Primitives";
import { passwordRequirements } from "../../utils/passwordPolicy";

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <View className="mt-2 mb-2" accessibilityLabel="Password requirements">
      {passwordRequirements(password).map((rule) => (
        <Text
          key={rule.label}
          className="text-xs leading-5"
          style={{ color: rule.met ? "#22C55E" : "#A0A5AD" }}
        >
          {rule.met ? "✓" : "•"} {rule.label}
        </Text>
      ))}
    </View>
  );
}
