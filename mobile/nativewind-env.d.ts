/// <reference types="nativewind/types" />
declare module '*.css';

import 'react-native-safe-area-context';
declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps {
    className?: string;
  }
}
