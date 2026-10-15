import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface AmbientCanvasProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  showTopGlow?: boolean;
  showBottomGlow?: boolean;
}

/**
 * AmbientCanvas — Cinematic Obsidian Background with Stadium Light Bloom
 * Provides the rich #0C0D0E canvas with subtle, non-intrusive reflected
 * stadium orange ambient blooms (rgba(232,93,38,0.08)) in the background.
 */
export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({
  children,
  style,
  className = '',
  showTopGlow = true,
  showBottomGlow = true,
}) => {
  return (
    <View style={[styles.container, style]} className={`bg-[#0C0D0E] flex-1 ${className}`}>
      {/* Background Stadium Glow - Top Right */}
      {showTopGlow && (
        <View
          pointerEvents="none"
          style={styles.topGlow}
        />
      )}

      {/* Background Stadium Glow - Bottom Left */}
      {showBottomGlow && (
        <View
          pointerEvents="none"
          style={styles.bottomGlow}
        />
      )}

      {children}
    </View>
  );
};

export interface AmbientGlowOverlayProps {
  showTop?: boolean;
  showBottom?: boolean;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  size?: number;
  opacity?: number;
}

export const AmbientGlowOverlay: React.FC<AmbientGlowOverlayProps> = ({
  showTop = true,
  showBottom = true,
  top,
  left,
  right,
  bottom,
  size,
  opacity,
}) => {
  if (top !== undefined || left !== undefined || right !== undefined || bottom !== undefined || size !== undefined) {
    const s = size || 280;
    const bgOpacity = opacity !== undefined ? opacity : 0.08;
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top,
          left,
          right,
          bottom,
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: `rgba(232, 93, 38, ${bgOpacity})`,
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <>
      {showTop && <View pointerEvents="none" style={styles.topGlow} />}
      {showBottom && <View pointerEvents="none" style={styles.bottomGlow} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0C0D0E',
    position: 'relative',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(232, 93, 38, 0.08)',
    transform: [{ scaleX: 1.2 }],
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(232, 93, 38, 0.05)',
  },
});

export default AmbientCanvas;
