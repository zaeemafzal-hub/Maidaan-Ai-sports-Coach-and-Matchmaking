import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "../../components/theme/Icons";
import { Platform, useWindowDimensions } from "../../components/theme/Primitives";
import {useThemeColors} from '../../components/theme/AppearanceControls';

export default function TabsLayout() {
  const colors=useThemeColors();
  const { width } = useWindowDimensions();
  const sidebar = Platform.OS === "web" && width >= 1000;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? "left" : "bottom",
        tabBarLabelPosition: sidebar ? "beside-icon" : "below-icon",
        tabBarHideOnKeyboard: true,
        tabBarActiveBackgroundColor: sidebar
          ? "rgba(232,93,38,0.12)"
          : "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarItemStyle: sidebar
          ? { height: 56, maxHeight: 56, marginVertical: 5, borderRadius: 12 }
          : undefined,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: sidebar ? undefined : Platform.OS === "ios" ? 88 : 72,
          width: sidebar ? 190 : undefined,
          minWidth: sidebar ? 190 : undefined,
          maxWidth: sidebar ? 190 : undefined,
          paddingBottom: Platform.OS === "ios" ? 26 : 12,
          paddingTop: sidebar ? 36 : 6,
        },
        tabBarActiveTintColor: "#E85D26",
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="venues"
        options={{
          title: "Venues",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "business" : "business-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "AI Coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "fitness" : "fitness-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
