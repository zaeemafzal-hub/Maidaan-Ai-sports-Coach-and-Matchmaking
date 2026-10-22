import { create } from "zustand";

interface ScreenLoadingState {
  route: string;
  pending: Record<number, string>;
  setRoute: (route: string) => void;
  routeReader: (() => string | undefined) | null;
  setRouteReader: (reader: (() => string | undefined) | null) => void;
  currentRoute: () => string;
  begin: (route?: string) => () => void;
}

let nextRequest = 0;
export const useScreenLoadingStore = create<ScreenLoadingState>((set, get) => ({
  route: "/",
  pending: {},
  setRoute: (route) => set({ route }),
  routeReader: null,
  setRouteReader: (routeReader) => set({ routeReader }),
  currentRoute: () => get().routeReader?.() || get().route,
  begin: (route = get().currentRoute()) => {
    const id = ++nextRequest;
    set((state) => ({ pending: { ...state.pending, [id]: route } }));
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      set((state) => {
        const pending = { ...state.pending };
        delete pending[id];
        return { pending };
      });
    };
  },
}));
