import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeatherOutlook } from '../../services/weatherService';

interface WeatherCompactBarProps {
  weather: WeatherOutlook | null;
  loading: boolean;
  className?: string;
}

export const WeatherCompactBar: React.FC<WeatherCompactBarProps> = ({
  weather,
  loading,
  className = '',
}) => {
  if (loading) {
    return (
      <View
        className={`flex-row items-center justify-between bg-[#141518]/25 border border-[rgba(255,255,255,0.08)] px-3.5 py-2 rounded-xl ${className}`}
      >
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#E85D26" />
          <Text className="text-[#5C616A] text-xs font-medium ml-2">
            Loading pitch weather...
          </Text>
        </View>
      </View>
    );
  }

  if (!weather) {
    return (
      <View
        className={`flex-row items-center justify-between bg-[#141518]/25 border border-[rgba(255,255,255,0.08)] px-3.5 py-2 rounded-xl ${className}`}
      >
        <View className="flex-row items-center">
          <Ionicons name="cloud-offline-outline" size={14} color="#5C616A" />
          <Text className="text-[#5C616A] text-xs font-normal ml-1.5">
            Weather unavailable
          </Text>
        </View>
      </View>
    );
  }

  const isSuitable = weather.recommendation === 'OUTDOOR_SUITABLE';
  const isCaution = weather.recommendation === 'CAUTION';

  // Semantic badge styling
  const badgeBg = isSuitable
    ? 'bg-[#22C55E]/15 border-[#22C55E]/30'
    : isCaution
    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30'
    : 'bg-[#EF4444]/15 border-[#EF4444]/30';

  const badgeText = isSuitable
    ? 'text-[#22C55E]'
    : isCaution
    ? 'text-[#F59E0B]'
    : 'text-[#EF4444]';

  const badgeLabel = isSuitable
    ? 'Outdoor looks good'
    : isCaution
    ? 'Caution'
    : 'Indoor preferred';

  // Icon mapping based on condition
  const getConditionIcon = (condition: string): keyof typeof Ionicons.glyphMap => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy-outline';
    if (c.includes('cloud') || c.includes('overcast')) return 'partly-sunny-outline';
    if (c.includes('thunder')) return 'thunderstorm-outline';
    if (c.includes('clear')) return 'sunny-outline';
    return 'cloud-outline';
  };

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Weather in ${weather.location}: ${weather.temperatureC} degrees Celsius, ${weather.condition}, ${weather.rainProbability}% rain chance. ${badgeLabel}.`}
      className={`flex-row items-center justify-between bg-[#141518]/25 border border-[rgba(255,255,255,0.08)] px-3.5 py-2 rounded-xl shadow-xs ${className}`}
    >
      {/* Left: Weather Metrics */}
      <View className="flex-row items-center flex-1 mr-2">
        <Ionicons
          name={getConditionIcon(weather.condition)}
          size={16}
          color="#E85D26"
        />

        <Text className="text-white text-xs font-bold ml-1.5">
          {weather.temperatureC}°C
        </Text>

        <Text className="text-[#5C616A] text-xs mx-1.5">•</Text>

        <Text numberOfLines={1} className="text-[#AEB6BE] text-xs font-normal">
          {weather.condition}
        </Text>

        <Text className="text-[#5C616A] text-xs mx-1.5">•</Text>

        <View className="flex-row items-center">
          <Ionicons name="water-outline" size={11} color="#5C616A" />
          <Text className="text-[#5C616A] text-xs font-medium ml-0.5">
            Rain {weather.rainProbability}%
          </Text>
        </View>
      </View>

      {/* Right: Suitability Pill Badge */}
      <View className={`px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
        <Text className={`text-[10px] font-bold uppercase tracking-wider ${badgeText}`}>
          {badgeLabel}
        </Text>
      </View>
    </View>
  );
};

export default WeatherCompactBar;
