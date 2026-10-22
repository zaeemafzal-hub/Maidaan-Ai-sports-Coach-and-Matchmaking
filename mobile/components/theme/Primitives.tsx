import React, { createContext, useContext } from "react";
import * as Native from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import {
  appearanceStyle,
  keepsLightForeground,
  lightColor,
} from "../../utils/appearancePalette";
export * from "react-native";
export const SurfaceContrast = createContext(false);
const resolve = (value: number) => Native.StyleSheet.flatten(value as any);
function themed<T>(Base: T, surface = true): T {
  const Component = React.forwardRef<any, any>((props, ref) => {
    const light = useAppearanceStore((state) => state.resolved === "light");
    const inherited = useContext(SurfaceContrast);
    const keep = light
      ? (keepsLightForeground(props.style, resolve) ?? inherited)
      : false;
    const adapted: Record<string, any> = {
      ...props,
      ref,
      style: appearanceStyle(props.style, light, inherited, resolve),
    };
    if (Native.Platform.OS === "web" && props.accessibilityState) {
      for (const key of ["checked", "selected", "disabled", "expanded", "busy"])
        if (
          props.accessibilityState[key] !== undefined &&
          props[`aria-${key}`] === undefined
        )
          adapted[`aria-${key}`] = props.accessibilityState[key];
    }
    if (props.contentContainerStyle)
      adapted.contentContainerStyle = appearanceStyle(
        props.contentContainerStyle,
        light,
        keep,
        resolve,
      );
    if (light) {
      for (const key of [
        "color",
        "placeholderTextColor",
        "selectionColor",
        "underlineColorAndroid",
        "tintColor",
      ])
        if (props[key]) adapted[key] = lightColor(props[key], key, inherited);
    }
    const element = React.createElement(Base as any, adapted);
    return surface ? (
      <SurfaceContrast.Provider value={keep}>
        {element}
      </SurfaceContrast.Provider>
    ) : (
      element
    );
  });
  Component.displayName = `Appearance.${(Base as any).displayName || (Base as any).name || "Component"}`;
  cssInterop(Component, { className: "style" });
  return Component as T;
}
export const View = themed(Native.View);
export type View = Native.View;
export const Text = themed(Native.Text, false);
export type Text = Native.Text;
export const Pressable = themed(Native.Pressable);
export const TextInput = themed(Native.TextInput, false);
export type TextInput = Native.TextInput;
export const ScrollView = themed(Native.ScrollView);
export type ScrollView = Native.ScrollView;
export const FlatList = themed(Native.FlatList);
export type FlatList<T = unknown> = Native.FlatList<T>;
export const SectionList = themed(Native.SectionList);
export type SectionList<T = unknown> = Native.SectionList<T>;
export const SafeAreaView = themed(NativeSafeAreaView);
export type SafeAreaView = Native.View;
export const KeyboardAvoidingView = themed(Native.KeyboardAvoidingView);
export const ActivityIndicator = themed(Native.ActivityIndicator, false);
export const Image = themed(Native.Image, false);
export type Image = Native.Image;
export const ImageBackground = themed(Native.ImageBackground);
export const TouchableOpacity = themed(Native.TouchableOpacity);
export const TouchableWithoutFeedback = themed(Native.TouchableWithoutFeedback);
export const RefreshControl = themed(Native.RefreshControl, false);
