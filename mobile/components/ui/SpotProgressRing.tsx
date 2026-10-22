import React from 'react';
import { View, Text, StyleSheet } from '../theme/Primitives';

interface SpotProgressRingProps {
  slotsOpen: number;
  totalSlots: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  label?: string;
  displayMode?: 'open' | 'filled';
  glow?: boolean;
  className?: string;
}

/**
 * SpotProgressRing — Pure React Native circular slot progress ring
 * Visualizes available or filled spots with Cinematic Obsidian track and Solar Orange progress stroke.
 * Zero external native SVG dependencies required.
 */
export const SpotProgressRing: React.FC<SpotProgressRingProps> = ({
  slotsOpen,
  totalSlots,
  size = 68,
  strokeWidth = 7,
  trackColor = 'rgba(255, 255, 255, 0.10)',
  progressColor = '#E85D26',
  label,
  displayMode = 'open',
  glow = false,
  className = '',
}) => {
  const safeTotal = Math.max(1, totalSlots);
  const filledSlots = Math.max(0, safeTotal - Math.max(0, slotsOpen));
  const fillRatio = Math.min(1, Math.max(0, filledSlots / safeTotal));
  const degrees = fillRatio * 360;

  // Split rotation for the two 180-degree semicircles
  const rightDegrees = Math.min(180, degrees);
  const leftDegrees = Math.max(0, degrees - 180);

  const halfSize = size / 2;

  const displayCount = displayMode === 'filled' ? filledSlots : slotsOpen;
  const defaultLabel = displayMode === 'filled' ? 'spots filled' : 'spots open';
  const resolvedLabel = label !== undefined ? label : defaultLabel;

  return (
    <View
      className={`items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTotal, now: displayCount }}
      accessibilityLabel={`${displayCount} of ${safeTotal} ${resolvedLabel}`}
    >
      {/* Optional Ambient Glow Behind Ring */}
      {glow && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 1.18,
            height: size * 1.18,
            borderRadius: (size * 1.18) / 2,
            backgroundColor: 'rgba(232, 93, 38, 0.22)',
            zIndex: 0,
          }}
        />
      )}

      {/* Background Track Ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Right Half Semi-circle Progress */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: halfSize,
          width: halfSize,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={[
            styles.ring,
            {
              position: 'absolute',
              top: 0,
              left: -halfSize,
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderTopColor: progressColor,
              borderRightColor: progressColor,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: [{ rotate: `${-135 + rightDegrees}deg` }],
            },
          ]}
        />
      </View>

      {/* Left Half Semi-circle Progress */}
      {degrees > 180 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: halfSize,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={[
              styles.ring,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderTopColor: progressColor,
                borderLeftColor: progressColor,
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
                transform: [{ rotate: `${-45 + leftDegrees}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Center Tabular Counter */}
      <View className="items-center justify-center z-10">
        <View className="flex-row items-baseline">
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: size * 0.28,
              fontWeight: '900',
              letterSpacing: -0.5,
            }}
          >
            {displayCount}
          </Text>
          <Text
            style={{
              color: '#A0A5AD',
              fontSize: size * 0.18,
              fontWeight: '600',
            }}
          >
            /{safeTotal}
          </Text>
        </View>
        {resolvedLabel ? (
          <Text
            style={{
              color: '#A0A5AD',
              fontSize: Math.max(9, size * 0.10),
              fontWeight: '500',
              marginTop: 1,
              letterSpacing: 0.2,
            }}
          >
            {resolvedLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
});

export default SpotProgressRing;
