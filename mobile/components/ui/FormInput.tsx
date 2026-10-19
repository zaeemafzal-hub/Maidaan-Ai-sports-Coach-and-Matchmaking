import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardTypeOptions,
  StyleSheet,
  Pressable,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  onFocus?: TextInputProps['onFocus'];
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  helperText,
  rightElement,
  testID,
  accessibilityLabel,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry;
  const showPasswordToggle = isPassword && !rightElement;

  return (
    <View className="w-full">
      <Text className="text-[#AEB6BE] text-xs font-semibold tracking-wider uppercase mb-2">
        {label}
      </Text>

      <View
        className={`w-full min-h-[52px] flex-row items-center px-4 py-3 rounded-[16px] bg-[#1B1D22] border ${
          error
            ? 'border-[#EF4444]'
            : isFocused
            ? 'border-[#E85D26]'
            : 'border-[rgba(255,255,255,0.08)]'
        }`}
      >
        <TextInput
          testID={testID}
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#5C616A"
          secureTextEntry={isPassword && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={(event) => {setIsFocused(true);onFocus?.(event);}}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel || label}
          className="flex-1 text-white text-base font-normal p-0"
          style={styles.textInput}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            className="p-1 active:opacity-70"
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#AEB6BE"
            />
          </Pressable>
        ) : rightElement ? (
          <View className="ml-2">{rightElement}</View>
        ) : null}
      </View>

      {error ? (
        <Text className="text-[#EF4444] text-xs font-medium mt-1.5 ml-1">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-[#5C616A] text-xs font-normal mt-1.5 ml-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  textInput: {
    outlineStyle: 'none',
  } as any,
});
