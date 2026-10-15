import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant =
  | 'live'
  | 'olive'
  | 'accent'
  | 'brand'
  | 'stone'
  | 'neutral'
  | 'rust'
  | 'warm'
  | 'outline'
  | 'secondary'
  | 'suitable'
  | 'caution'
  | 'indoor'
  | 'verified';

interface ArenaBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const ArenaBadge: React.FC<ArenaBadgeProps> = ({
  label,
  variant = 'brand',
  size = 'sm',
  className = '',
}) => {
  const isSm = size === 'sm';

  const getVariantStyles = () => {
    switch (variant) {
      case 'live':
        return {
          container: 'bg-[#EF4444]/15 border border-[#EF4444]/30',
          text: 'text-[#EF4444] font-bold',
          showDot: true,
          dotColor: 'bg-[#EF4444]',
        };
      case 'suitable':
      case 'olive':
        return {
          container: 'bg-[#22C55E]/15 border border-[#22C55E]/30',
          text: 'text-[#22C55E] font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'caution':
        return {
          container: 'bg-[#F59E0B]/15 border border-[#F59E0B]/30',
          text: 'text-[#F59E0B] font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'indoor':
        return {
          container: 'bg-[#EF4444]/15 border border-[#EF4444]/30',
          text: 'text-[#EF4444] font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'verified':
        return {
          container: 'bg-[#3B82F6]/15 border border-[#3B82F6]/30',
          text: 'text-[#3B82F6] font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'secondary':
        return {
          container: 'bg-[#7FD1AE]/15 border border-[#7FD1AE]/30',
          text: 'text-[#7FD1AE] font-bold',
          showDot: false,
          dotColor: '',
        };
      case 'stone':
      case 'neutral':
        return {
          container: 'bg-[#1B1D22] border border-[rgba(255,255,255,0.08)]',
          text: 'text-[#AEB6BE] font-medium',
          showDot: false,
          dotColor: '',
        };
      case 'outline':
        return {
          container: 'bg-transparent border border-[rgba(255,255,255,0.15)]',
          text: 'text-white font-medium',
          showDot: false,
          dotColor: '',
        };
      case 'brand':
      case 'rust':
      case 'warm':
      case 'accent':
      default:
        return {
          container: 'bg-[#E85D26]/15 border border-[#E85D26]/30',
          text: 'text-[#E85D26] font-bold',
          showDot: false,
          dotColor: '',
        };
    }
  };

  const { container, text, showDot, dotColor } = getVariantStyles();

  return (
    <View
      className={`flex-row items-center rounded-full ${
        isSm ? 'px-2.5 py-0.5' : 'px-3.5 py-1'
      } ${container} ${className}`}
    >
      {showDot && (
        <View className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5`} />
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

export const StatusBadge = ArenaBadge;
