import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Sport } from '../../types';

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
      accessibilityLabel={`${label} sport ${selected ? 'selected' : 'not selected'}`}
      className={`flex-1 py-3 px-1 rounded-xl items-center justify-center min-h-[98px] border relative transition-all ${
        isPressed ? 'scale-[0.96] opacity-90' : 'scale-100'
      } ${
        selected
          ? 'bg-stone-light border-2 border-olive border-b-[4px] border-b-olive-dark shadow-sm'
          : 'bg-warm-white border border-stone border-b-[3px] border-b-stone-muted/60'
      }`}
    >
      {/* Selected Indicator Badge */}
      {selected && (
        <View className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-olive items-center justify-center shadow-xs">
          <Ionicons name="checkmark" size={11} color="#F4F1EA" />
        </View>
      )}

      {/* Tactile Equipment Icon Well */}
      <View
        className={`w-11 h-11 rounded-lg items-center justify-center mb-1 ${
          selected
            ? 'bg-olive/15 border border-olive/30'
            : 'bg-stone/20 border border-stone/40'
        }`}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={22}
          color={selected ? '#3D4438' : '#666B60'}
        />
      </View>

      {/* Athletic Sport Label */}
      <Text
        numberOfLines={1}
        className={`text-[11px] text-center tracking-tight uppercase ${
          selected ? 'text-graphite font-black' : 'text-stone-muted font-bold'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
};
