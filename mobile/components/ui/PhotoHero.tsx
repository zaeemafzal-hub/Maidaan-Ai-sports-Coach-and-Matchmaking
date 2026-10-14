import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';

interface PhotoHeroProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'rust' | 'olive' | 'stone';
  height?: number;
  children?: React.ReactNode;
  className?: string;
}

export const PhotoHero: React.FC<PhotoHeroProps> = ({
  imageSource,
  title,
  subtitle,
  badgeText,
  badgeVariant = 'olive',
  height = 240,
  children,
  className = '',
}) => {
  return (
    <View
      style={{ height }}
      className={`w-full relative overflow-hidden bg-graphite ${className}`}
    >
      {/* Background Photography */}
      <Image
        source={imageSource}
        className="w-full h-full object-cover"
        resizeMode="cover"
      />

      {/* Atmospheric Vignette Overlay */}
      <View className="absolute inset-0 bg-graphite/45" />
      <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/50 to-transparent" />

      {/* Foreground Content */}
      <View className="absolute bottom-4 left-5 right-5 z-10">
        {badgeText && (
          <View className="flex-row mb-2">
            <View
              className={`px-2.5 py-0.5 rounded-sm ${
                badgeVariant === 'rust'
                  ? 'bg-rust border border-rust-dark'
                  : 'bg-olive border border-olive-dark'
              }`}
            >
              <Text className="text-warm-white text-[10px] font-black uppercase tracking-wider">
                {badgeText}
              </Text>
            </View>
          </View>
        )}

        <Text
          numberOfLines={2}
          className="text-warm-white text-2xl font-black uppercase tracking-tight"
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            numberOfLines={2}
            className="text-stone text-xs font-medium mt-1 leading-relaxed"
          >
            {subtitle}
          </Text>
        )}

        {children}
      </View>
    </View>
  );
};
