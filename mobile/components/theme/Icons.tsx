import React, { useContext } from "react";
import * as Icons from "@expo/vector-icons";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import { lightColor } from "../../utils/appearancePalette";
import { SurfaceContrast } from "./Primitives";
export * from "@expo/vector-icons";
function themed<T>(Base: T): T {
  const Component = React.forwardRef<any, any>((props, ref) => {
    const light = useAppearanceStore((state) => state.resolved === "light"),
      keep = useContext(SurfaceContrast);
    return React.createElement(Base as any, {
      ...props,
      ref,
      color: light ? lightColor(props.color, "color", keep) : props.color,
    });
  });
  // Preserve the icon family metadata used by JSX prop types and font loading.
  Object.assign(Component, Base);
  return Component as T;
}
export const Ionicons = themed(Icons.Ionicons);
export const MaterialCommunityIcons = themed(Icons.MaterialCommunityIcons);
export const MaterialIcons = themed(Icons.MaterialIcons);
export const FontAwesome = themed(Icons.FontAwesome);
export const FontAwesome5 = themed(Icons.FontAwesome5);
export const Feather = themed(Icons.Feather);
export const AntDesign = themed(Icons.AntDesign);
