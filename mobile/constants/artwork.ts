// Approved local artwork: four supplied backgrounds and the transparent Welcome render.
export const ARTWORK = {
  form: require("../assets/artwork/form-atmosphere.png"),
  venues: require("../assets/artwork/venue-court.png"),
  discover: require("../assets/artwork/discover-football.png"),
  profile: require("../assets/artwork/profile-equipment.png"),
  welcome: require("../assets/artwork/welcome-sports-cutout.png"),
} as const;
export type ArtworkKind = Exclude<keyof typeof ARTWORK, "welcome">;
export const GLASS_CARD = {
  backgroundColor: "rgba(20,21,24,0.24)",
  borderColor: "rgba(255,255,255,0.22)",
} as const;
