import { create } from "zustand";
export const useGuideStore = create<{
  visible: boolean;
  chapter: number;
  open(): void;
  close(): void;
  select(chapter: number): void;
}>((set) => ({
  visible: false,
  chapter: 0,
  open: () => set({ visible: true, chapter: 0 }),
  close: () => set({ visible: false }),
  select: (chapter) => set({ chapter }),
}));
