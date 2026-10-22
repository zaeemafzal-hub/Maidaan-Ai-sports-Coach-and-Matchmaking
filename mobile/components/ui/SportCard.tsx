import React, { useState } from "react";
import { View, Text, Pressable } from "../theme/Primitives";
import { MaterialCommunityIcons, Ionicons } from "../theme/Icons";
import { Sport } from "../../types";

interface SportCardProps {
  sport: Sport;
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onToggle: () => void;
  testID?: string;
}

export const SportCard: React.FC<SportCardProps> = ({
  sport,
  label,
  iconName,
  selected,
  onToggle,
  testID,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label} sport ${selected ? "selected" : "not selected"}`}
      className={`flex-1 py-3 px-1 rounded-2xl items-center justify-center min-h-[96px] border relative transition-all ${
        isPressed ? "scale-[0.96]" : "scale-100"
      } ${
        selected
          ? "bg-[#1B1D22] border-2 border-[#E85D26] shadow-sm shadow-[#E85D26]/20"
          : "bg-[#141518]/25 border border-white/[0.08]"
      }`}
    >
      {/* Orange Selection Indicator Badge */}
      {selected && (
        <View className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E85D26] items-center justify-center">
          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
        </View>
      )}

      {/* Equipment Icon Container */}
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center mb-1.5 ${
          selected
            ? "bg-[#E85D26]/15 border border-[#E85D26]/30"
            : "bg-[#101214] border border-white/[0.06]"
        }`}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={22}
          color={selected ? "#E85D26" : "#A0A5AD"}
        />
      </View>

      {/* Sport Label with zero truncation */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ color: selected ? "#FFFFFF" : "#A0A5AD" }}
        className={`text-[10px] text-center tracking-wide uppercase font-bold px-0.5 ${
          selected ? "text-white font-extrabold" : "text-[#A0A5AD]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};
