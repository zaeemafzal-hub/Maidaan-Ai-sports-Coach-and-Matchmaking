// Stable aliases let existing screens keep their image API while sharing approved art.
import { ARTWORK } from "./artwork";

export const IMAGES = {
  heroStadium: ARTWORK.discover,
  appIcon: require("../assets/icon.png"),
  arenaSplash: ARTWORK.form,
  arenaOnboard: ARTWORK.profile,
  arenaHome: ARTWORK.discover,
  arenaMatch: ARTWORK.venues,
  arenaLive: ARTWORK.discover,
  arenaGround: ARTWORK.venues,
  arenaTeam: ARTWORK.venues,
  arenaPlayer: ARTWORK.profile,
  welcomeAthletes: ARTWORK.welcome,
} as const;
