import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardTypeOptions,
  StyleSheet,
} from 'react-native';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
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
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full">
      <Text className="text-graphite text-xs font-bold uppercase tracking-wider mb-2">
        {label}
      </Text>

      <View
        className={`w-full flex-row items-center px-4 py-3.5 rounded-xl bg-warm-white border ${
          error
            ? 'border-rust'
            : isFocused
            ? 'border-olive border-2'
            : 'border-stone'
        }`}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8D9287"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel || label}
          className="flex-1 text-graphite text-base font-medium p-0"
          style={styles.textInput}
        />

        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>

      {error ? (
        <Text className="text-rust text-xs font-medium mt-1.5 ml-1">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-stone-muted text-xs font-normal mt-1.5 ml-1">
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
