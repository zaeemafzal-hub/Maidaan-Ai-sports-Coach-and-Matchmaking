import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, GestureResponderEvent } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'rust';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  testID,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  if (variant === 'ghost') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        disabled={disabled || loading}
        className={`w-full min-h-[44px] py-3 items-center justify-center ${
          isPressed ? 'opacity-60 scale-[0.98]' : 'opacity-100'
        } ${className}`}
      >
        <Text className="text-graphite text-sm font-bold tracking-wide">
          {title}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        disabled={disabled || loading}
        className={`w-full min-h-[48px] py-3.5 px-6 rounded-xl border border-graphite items-center justify-center bg-warm-white ${
          isPressed ? 'scale-[0.98] bg-stone-light' : 'scale-100'
        } ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        <Text className="text-graphite text-base font-bold tracking-tight">
          {title}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'rust') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        disabled={disabled || loading}
        className={`w-full min-h-[48px] py-3.5 px-6 rounded-xl items-center justify-center bg-rust shadow-sm ${
          isPressed ? 'scale-[0.98] bg-rust-dark' : 'scale-100'
        } ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        {loading ? (
          <ActivityIndicator color="#F4F1EA" />
        ) : (
          <Text className="text-warm-white text-base font-bold tracking-tight uppercase">
            {title}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled || loading}
      className={`w-full min-h-[48px] py-3.5 px-6 rounded-xl items-center justify-center bg-olive shadow-sm ${
        isPressed ? 'scale-[0.98] bg-olive-dark' : 'scale-100'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="#F4F1EA" />
      ) : (
        <Text className="text-warm-white text-base font-bold tracking-tight uppercase">
          {title}
        </Text>
      )}
    </Pressable>
  );
};
