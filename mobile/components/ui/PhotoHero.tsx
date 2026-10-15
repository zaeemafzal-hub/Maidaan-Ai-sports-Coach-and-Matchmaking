import React from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet } from 'react-native';

interface PhotoHeroProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'brand' | 'rust' | 'olive' | 'stone' | 'suitable' | 'caution';
  height?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * PhotoHero — Container-driven photographic hero with cinematic dark gradient overlay
 * Ensures high contrast text readability over action photography.
 */
export const PhotoHero: React.FC<PhotoHeroProps> = ({
  imageSource,
  title,
  subtitle,
  badgeText,
  badgeVariant = 'brand',
  height = 240,
  children,
  className = '',
}) => {
  return (
    <View
      style={{ height }}
      className={`w-full relative overflow-hidden bg-[#0C0D0E] ${className}`}
    >
      {/* Background Photography */}
      <Image
        source={imageSource}
        className="w-full h-full"
        resizeMode="cover"
      />

      {/* Cinematic Multi-stop Dark Gradient Overlay */}
      <View style={styles.topVignette} pointerEvents="none" />
      <View style={styles.midVignette} pointerEvents="none" />
      <View style={styles.bottomVignette} pointerEvents="none" />

      {/* Foreground Content */}
      <View className="absolute bottom-4 left-5 right-5 z-10">
        {badgeText && (
          <View className="flex-row mb-2">
            <View
              className={`px-2.5 py-0.5 rounded-full border ${
                badgeVariant === 'suitable' || badgeVariant === 'olive'
                  ? 'bg-[#22C55E]/20 border-[#22C55E]/40'
                  : badgeVariant === 'caution'
                  ? 'bg-[#F59E0B]/20 border-[#F59E0B]/40'
                  : 'bg-[#E85D26]/20 border-[#E85D26]/40'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  badgeVariant === 'suitable' || badgeVariant === 'olive'
                    ? 'text-[#22C55E]'
                    : badgeVariant === 'caution'
                    ? 'text-[#F59E0B]'
                    : 'text-[#E85D26]'
                }`}
              >
                {badgeText}
              </Text>
            </View>
          </View>
        )}

        <Text
          numberOfLines={2}
          className="text-white text-2xl font-black uppercase tracking-tight"
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            numberOfLines={2}
            className="text-[#A0A5AD] text-xs font-medium mt-1 leading-relaxed"
          >
            {subtitle}
          </Text>
        )}

        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 13, 14, 0.25)',
  },
  midVignette: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 13, 14, 0.50)',
  },
  bottomVignette: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 13, 14, 0.82)',
  },
});

export default PhotoHero;
