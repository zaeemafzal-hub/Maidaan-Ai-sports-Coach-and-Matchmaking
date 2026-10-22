import React from "react";
import { View, Text } from "../theme/Primitives";
import { Ionicons, Feather } from "../theme/Icons";
import { AgentWeatherData } from "../../services/agentService";
import { WeatherDecisionPill } from "../ui/WeatherDecisionPill";

interface WeatherResultCardProps {
  weather: AgentWeatherData;
  className?: string;
}

export const WeatherResultCard: React.FC<WeatherResultCardProps> = ({
  weather,
  className = "",
}) => {
  if (!weather) return null;

  return (
    <View
      className={`w-full mt-2.5 p-4 rounded-xl bg-[#141518]/25 border border-white/[0.08] ${className}`}
    >
      {/* Header with Location & Suitability Pill */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name="location-sharp" size={14} color="#E85D26" />
          <Text
            className="text-white text-xs font-bold uppercase tracking-wider ml-1"
            numberOfLines={1}
          >
            {weather.location}
          </Text>
        </View>

        <WeatherDecisionPill recommendation={weather.recommendation} compact />
      </View>

      {/* Metrics Row */}
      <View className="flex-row items-center justify-between bg-[#141518]/25 rounded-lg p-3 border border-white/[0.06] mb-3">
        {/* Temperature */}
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-black">
            {Math.round(weather.temperatureC)}°C
          </Text>
          <Text className="text-[#A0A5AD] text-[10px] font-semibold uppercase">
            {weather.condition}
          </Text>
        </View>

        <View className="w-[1px] h-7 bg-white/[0.08]" />

        {/* Rain Probability */}
        <View className="items-center flex-1">
          <View className="flex-row items-center">
            <Ionicons name="rainy-outline" size={13} color="#64B5F6" />
            <Text className="text-white text-sm font-bold ml-1">
              {weather.rainProbability}%
            </Text>
          </View>
          <Text className="text-[#A0A5AD] text-[10px] font-semibold uppercase">
            Rain Risk
          </Text>
        </View>

        <View className="w-[1px] h-7 bg-white/[0.08]" />

        {/* Wind Speed */}
        <View className="items-center flex-1">
          <View className="flex-row items-center">
            <Feather name="wind" size={13} color="#7FD1AE" />
            <Text className="text-white text-sm font-bold ml-1">
              {Math.round(weather.windSpeedKmh)}
            </Text>
          </View>
          <Text className="text-[#A0A5AD] text-[10px] font-semibold uppercase">
            km/h Wind
          </Text>
        </View>
      </View>

      {/* Rationale Advice */}
      {weather.reason ? (
        <View className="flex-row items-start">
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#E85D26"
            style={{ marginTop: 1 }}
          />
          <Text className="text-[#A0A5AD] text-xs font-normal ml-1.5 flex-1 leading-4">
            {weather.reason}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
