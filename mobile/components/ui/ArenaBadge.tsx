import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant = 'live' | 'olive' | 'stone' | 'rust' | 'outline';

interface ArenaBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const ArenaBadge: React.FC<ArenaBadgeProps> = ({
  label,
  variant = 'olive',
  size = 'sm',
  className = '',
}) => {
  const isSm = size === 'sm';

  const getVariantStyles = () => {
    switch (variant) {
      case 'live':
        return {
          container: 'bg-rust/20 border border-rust',
          text: 'text-rust font-extrabold',
          showDot: true,
          dotColor: 'bg-rust',
        };
      case 'rust':
        return {
          container: 'bg-rust border border-rust-dark',
          text: 'text-warm-white font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'stone':
        return {
          container: 'bg-stone/30 border border-stone',
          text: 'text-graphite font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'outline':
        return {
          container: 'bg-transparent border border-stone',
          text: 'text-graphite font-semibold',
          showDot: false,
          dotColor: '',
        };
      case 'olive':
      default:
        return {
          container: 'bg-olive/15 border border-olive',
          text: 'text-olive font-extrabold',
          showDot: false,
          dotColor: '',
        };
    }
  };

  const { container, text, showDot, dotColor } = getVariantStyles();

  return (
    <View
      className={`flex-row items-center rounded-sm ${
        isSm ? 'px-2 py-0.5' : 'px-3 py-1'
      } ${container} ${className}`}
    >
      {showDot && (
        <View className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5 animate-pulse`} />
      )}
      <Text
        className={`tracking-wider uppercase ${
          isSm ? 'text-[10px]' : 'text-xs'
        } ${text}`}
      >
        {label}
      </Text>
    </View>
  );
};
