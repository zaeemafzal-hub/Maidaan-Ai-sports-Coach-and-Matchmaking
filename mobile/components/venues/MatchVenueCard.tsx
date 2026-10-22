import React from "react";
import { View, Text, Pressable, Platform } from "../theme/Primitives";
import { Link, router } from "expo-router";
import { Ionicons } from "../theme/Icons";
import { venueMapUrl } from "../../utils/venueLocation";

export function MatchVenueCard({ name, area }: { name: string; area: string }) {
  return (
    <View className="rounded-2xl border border-white/[0.08] bg-[#141518]/25 p-4">
      <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider mb-2">
        Where you’ll play
      </Text>
      <Link
        href={venueMapUrl(name, area)}
        target="_blank"
        rel="noopener noreferrer"
        asChild
      >
        <Pressable
          {...Platform.select({
            web: {
              hrefAttrs: { target: "_blank", rel: "noopener noreferrer" },
            },
            default: {},
          })}
          accessibilityRole="link"
          accessibilityLabel={`Open map for ${name}, ${area}, Lahore`}
          className="min-h-[48px] flex-row items-center gap-3"
        >
          <Ionicons name="location-outline" size={24} color="#E85D26" />
          <View className="flex-1">
            <Text className="text-white text-sm font-bold">{name}</Text>
            <Text className="text-[#A0A5AD] text-xs mt-1">{area}, Lahore</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#E85D26" />
        </Pressable>
      </Link>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Find this venue profile"
        onPress={() =>
          router.push({ pathname: "/hubs", params: { search: name } })
        }
        className="min-h-[44px] mt-2 border-t border-white/[0.08] justify-center"
      >
        <Text className="text-[#E85D26] text-xs font-semibold">
          Find venue profile & available slots →
        </Text>
      </Pressable>
    </View>
  );
}
