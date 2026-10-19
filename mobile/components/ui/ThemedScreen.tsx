import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { ArtworkBackground } from "./Artwork";
import { ArtworkKind } from "../../constants/artwork";

export function artworkForRoute(path: string): ArtworkKind {
  if (
    path.includes("create-match") ||
    path.includes("/admin") ||
    path.includes("/bookings")
  )
    return "form";
  if (path.includes("discover")) return "discover";
  if (
    path.includes("/coach") ||
    path.includes("concierge") ||
    path.includes("profile") ||
    path.includes("player-setup")
  )
    return "profile";
  if (
    path.includes("/captain") ||
    path.includes("/match") ||
    path.includes("/venues") ||
    path.includes("/hubs")
  )
    return "venues";
  return "form";
}

// Preserve the original SafeAreaView API, including edges, layout and accessibility.
export function ThemedScreen({
  children,
  artwork,
  style,
  ...props
}: React.ComponentProps<typeof SafeAreaView> & { artwork?: ArtworkKind }) {
  const pathname = usePathname();
  return (
    <SafeAreaView
      {...props}
      style={[{ flex: 1, backgroundColor: "#0C0D0E", overflow: "hidden" }, style]}
    >
      <ArtworkBackground
        kind={artwork ?? artworkForRoute(pathname)}
        dim={pathname.includes("/chat") ? 0.8 : 0.72}
      />
      {children}
    </SafeAreaView>
  );
}
