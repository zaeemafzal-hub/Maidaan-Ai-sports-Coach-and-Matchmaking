import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeatherOutlook } from '../../services/weatherService';

interface WeatherOutlookCardProps {
  weather: WeatherOutlook | null;
  loading: boolean;
  timeContext?: string;
  sport?: string;
  className?: string;
}

export const WeatherOutlookCard: React.FC<WeatherOutlookCardProps> = ({
  weather,
  loading,
  timeContext,
  sport,
  className = '',
}) => {
  if (loading) {
    return (
      <View
        className={`bg-[#141518] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 shadow-sm ${className}`}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[#5C616A] text-xs font-semibold uppercase tracking-wider">
            Match-Day Weather Outlook
          </Text>
          <ActivityIndicator size="small" color="#E85D26" />
        </View>
        <Text className="text-[#5C616A] text-xs font-normal">
          Checking meteorological conditions and pitch suitability...
        </Text>
      </View>
    );
  }

  if (!weather) {
    return (
      <View
        className={`bg-[#141518] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 shadow-sm ${className}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-[#5C616A] text-xs font-semibold uppercase tracking-wider">
            Match-Day Weather Outlook
          </Text>
          <Ionicons name="cloud-offline-outline" size={16} color="#5C616A" />
        </View>
        <Text className="text-[#5C616A] text-xs font-normal">
          Weather advisory unavailable • Fixture scheduling and matchmaking remain fully open.
        </Text>
      </View>
    );
  }

  const isSuitable = weather.recommendation === 'OUTDOOR_SUITABLE';
  const isCaution = weather.recommendation === 'CAUTION';

  const badgeConfig = isSuitable
    ? {
        bg: 'bg-[#22C55E]/15 border-[#22C55E]/35',
        text: 'text-[#22C55E]',
        icon: 'checkmark-circle' as const,
        iconColor: '#22C55E',
        label: 'OUTDOOR LOOKS GOOD',
      }
    : isCaution
    ? {
        bg: 'bg-[#F59E0B]/15 border-[#F59E0B]/35',
        text: 'text-[#F59E0B]',
        icon: 'alert-circle' as const,
        iconColor: '#F59E0B',
        label: 'CAUTION ADVISED',
      }
    : {
        bg: 'bg-[#EF4444]/15 border-[#EF4444]/35',
        text: 'text-[#EF4444]',
        icon: 'rainy' as const,
        iconColor: '#EF4444',
        label: 'INDOOR PREFERRED',
      };

  const getConditionIcon = (condition: string): keyof typeof Ionicons.glyphMap => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy';
    if (c.includes('cloud') || c.includes('overcast')) return 'partly-sunny';
    if (c.includes('thunder')) return 'thunderstorm';
    if (c.includes('clear')) return 'sunny';
    return 'cloud';
  };

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Weather Outlook: ${badgeConfig.label}. ${weather.reason}`}
      className={`bg-[#141518] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 shadow-sm ${className}`}
    >
      {/* Header Strip: Title & Suitability Badge */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="cloudy-night-outline" size={15} color="#A0A5AD" />
          <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] text-xs font-semibold uppercase tracking-wider ml-1.5">
            Weather Outlook
          </Text>
          {timeContext && (
            <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-xs font-normal ml-1">
              • {timeContext}
            </Text>
          )}
        </View>

        <View className={`flex-row items-center px-2.5 py-1 rounded-full border ${badgeConfig.bg}`}>
          <Ionicons name={badgeConfig.icon} size={12} color={badgeConfig.iconColor} />
          <Text style={{ color: badgeConfig.iconColor }} className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${badgeConfig.text}`}>
            {badgeConfig.label}
          </Text>
        </View>
      </View>

      {/* Main Meteorological Metrics Grid */}
      <View className="flex-row items-center justify-between py-2 border-y border-[rgba(255,255,255,0.08)]">
        {/* Temp & Condition */}
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-[#1B1D22] border border-[rgba(255,255,255,0.08)] items-center justify-center mr-2.5">
            <Ionicons
              name={getConditionIcon(weather.condition)}
              size={20}
              color="#E85D26"
            />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF' }} className="text-white text-xl font-bold tracking-tight">
              {weather.temperatureC}°C
            </Text>
            <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] text-xs font-medium">
              {weather.condition}
            </Text>
          </View>
        </View>

        {/* Rain Probability */}
        <View className="items-end">
          <View className="flex-row items-center">
            <Ionicons name="water-outline" size={13} color="#5C616A" />
            <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-bold ml-1">
              {weather.rainProbability}%
            </Text>
          </View>
          <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-[10px] font-medium mt-0.5">
            Rain Chance
          </Text>
        </View>

        {/* Wind Speed */}
        <View className="items-end">
          <View className="flex-row items-center">
            <Ionicons name="speedometer-outline" size={13} color="#5C616A" />
            <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-bold ml-1">
              {weather.windSpeedKmh} km/h
            </Text>
          </View>
          <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-[10px] font-medium mt-0.5">
            Wind Speed
          </Text>
        </View>
      </View>

      {/* Recommendation Reason Narrative */}
      <View className="mt-3">
        <Text style={{ color: '#FFFFFF' }} className="text-white text-xs font-medium leading-relaxed">
          {weather.reason}
        </Text>
      </View>

      {/* Advisory Non-Blocking Footnote */}
      <View className="mt-2.5 pt-2 border-t border-[rgba(255,255,255,0.08)] flex-row items-center">
        <Ionicons name="information-circle-outline" size={12} color="#5C616A" />
        <Text style={{ color: '#5C616A' }} className="text-[#5C616A] text-[10px] font-normal ml-1 flex-1">
          Advisory guidance only • Host and participants make the final match venue choice.
        </Text>
      </View>
    </View>
  );
};

export default WeatherOutlookCard;
