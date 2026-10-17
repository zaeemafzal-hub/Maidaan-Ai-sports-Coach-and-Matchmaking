/// <reference types="nativewind/types" />
declare module '*.css';

import 'react-native';
declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}

import 'react-native-safe-area-context';
declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps {
    className?: string;
  }
  interface SafeAreaViewProps {
    className?: string;
  }
}
