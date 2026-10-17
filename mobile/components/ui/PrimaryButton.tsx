import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, GestureResponderEvent, View } from 'react-native';

export interface PrimaryButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'warm' | 'rust';
  size?: 'sm' | 'md' | 'lg' | string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  testID?: string;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  testID,
  icon,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // Variant Styles
  let containerStyle = 'bg-[#E85D26] shadow-lg shadow-[#E85D26]/35';
  let textStyle = 'text-white font-extrabold';
  let indicatorColor = '#FFFFFF';

  if (variant === 'secondary') {
    containerStyle = 'bg-[#1B1D22] border border-[rgba(255,255,255,0.08)] active:bg-[#22252B]';
    textStyle = 'text-white font-semibold';
    indicatorColor = '#FFFFFF';
  } else if (variant === 'outline') {
    containerStyle = 'bg-transparent border border-[rgba(255,255,255,0.15)] active:bg-[rgba(255,255,255,0.05)]';
    textStyle = 'text-white font-semibold';
    indicatorColor = '#FFFFFF';
  } else if (variant === 'ghost') {
    containerStyle = 'bg-transparent active:bg-[rgba(255,255,255,0.05)]';
    textStyle = 'text-[#A0A5AD] font-semibold';
    indicatorColor = '#A0A5AD';
  } else if (variant === 'warm' || variant === 'rust') {
    containerStyle = 'bg-[#E85D26] shadow-lg shadow-[#E85D26]/35';
    textStyle = 'text-white font-extrabold';
    indicatorColor = '#FFFFFF';
  }

  // Size Styles
  let sizeStyle = 'min-h-[54px] py-3.5 px-6 rounded-full';
  let textSizeStyle = 'text-sm';
  if (size === 'sm') {
    sizeStyle = 'min-h-[42px] py-2 px-4 rounded-full';
    textSizeStyle = 'text-xs';
  } else if (size === 'lg') {
    sizeStyle = 'min-h-[58px] py-4 px-7 rounded-full';
    textSizeStyle = 'text-base';
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled || loading}
      className={`w-full ${sizeStyle} items-center justify-center flex-row ${containerStyle} ${
        isPressed ? 'scale-[0.98] bg-[#FF723A] opacity-95' : 'scale-100'
      } ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text
            style={{ color: variant === 'ghost' ? '#A0A5AD' : '#FFFFFF' }}
            className={`${textSizeStyle} tracking-wider uppercase ${textStyle}`}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export const SecondaryButton: React.FC<PrimaryButtonProps> = (props) => (
  <PrimaryButton {...props} variant="secondary" />
);

export const GhostButton: React.FC<PrimaryButtonProps> = (props) => (
  <PrimaryButton {...props} variant="ghost" />
);
