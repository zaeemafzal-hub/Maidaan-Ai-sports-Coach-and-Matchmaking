import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type AppearancePreference = "dark" | "light" | "system";
export type AppScheme = "dark" | "light";
const KEY = "maidaan.appearance.v1";
let changed = false;
export const useAppearanceStore = create<{
  preference: AppearancePreference;
  system: AppScheme;
  resolved: AppScheme;
  choose(preference: AppearancePreference): void;
  setSystem(system: AppScheme): void;
  hydrate(): Promise<void>;
}>((set, get) => ({
  preference: "dark",
  system: "dark",
  resolved: "dark",
  choose(preference) {
    changed = true;
    set({
      preference,
      resolved: preference === "system" ? get().system : preference,
    });
    void AsyncStorage.setItem(KEY, preference).catch(() => {});
  },
  setSystem(system) {
    const preference = get().preference;
    set({ system, resolved: preference === "system" ? system : preference });
  },
  async hydrate() {
    const value = await AsyncStorage.getItem(KEY).catch(() => null);
    if (!changed && ["dark", "light", "system"].includes(value || "")) {
      const preference = value as AppearancePreference;
      set({
        preference,
        resolved: preference === "system" ? get().system : preference,
      });
    }
  },
}));
