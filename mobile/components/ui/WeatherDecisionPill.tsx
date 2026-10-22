import React from 'react';
import { View, Text } from '../theme/Primitives';
import { Ionicons } from '../theme/Icons';

interface WeatherDecisionPillProps {
  recommendation?: 'OUTDOOR_SUITABLE' | 'CAUTION' | 'INDOOR_PREFERRED' | string;
  temperatureC?: number;
  condition?: string;
  compact?: boolean;
  className?: string;
}

/**
 * WeatherDecisionPill — Compact advisory weather suitability indicator
 * Provides glanceable outdoor/indoor guidance using semantic tokens:
 * #22C55E (Outdoor Suitable), #F59E0B (Caution), #EF4444 (Indoor Preferred).
 */
export const WeatherDecisionPill: React.FC<WeatherDecisionPillProps> = ({
  recommendation = 'OUTDOOR_SUITABLE',
  temperatureC,
  condition,
  compact = false,
  className = '',
}) => {
  const isSuitable = recommendation === 'OUTDOOR_SUITABLE';
  const isCaution = recommendation === 'CAUTION';

  const config = isSuitable
    ? {
        bg: 'bg-[#22C55E]/15 border-[#22C55E]/30',
        text: 'text-[#22C55E]',
        icon: 'checkmark-circle' as const,
        iconColor: '#22C55E',
        label: 'Outdoor looks good',
      }
    : isCaution
    ? {
        bg: 'bg-[#F59E0B]/15 border-[#F59E0B]/30',
        text: 'text-[#F59E0B]',
        icon: 'alert-circle' as const,
        iconColor: '#F59E0B',
        label: 'Caution advised',
      }
    : {
        bg: 'bg-[#EF4444]/15 border-[#EF4444]/30',
        text: 'text-[#EF4444]',
        icon: 'umbrella' as const,
        iconColor: '#EF4444',
        label: 'Indoor preferred',
      };

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Weather condition advisory: ${config.label}${
        temperatureC !== undefined ? `, ${temperatureC} degrees Celsius` : ''
      }`}
      className={`flex-row items-center border rounded-full ${
        compact ? 'px-2 py-0.5' : 'px-3 py-1'
      } ${config.bg} ${className}`}
    >
      <Ionicons name={config.icon} size={compact ? 11 : 13} color={config.iconColor} />
      <Text
        style={{ color: config.iconColor }}
        className={`font-bold tracking-wider uppercase ml-1.5 ${
          compact ? 'text-[9px]' : 'text-[11px]'
        } ${config.text}`}
      >
        {config.label}
      </Text>

      {temperatureC !== undefined && (
        <>
          <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-[10px] mx-1">•</Text>
          <Text style={{ color: '#FFFFFF' }} className="text-white text-[10px] font-bold">
            {temperatureC}°C
          </Text>
        </>
      )}
    </View>
  );
};

export default WeatherDecisionPill;
