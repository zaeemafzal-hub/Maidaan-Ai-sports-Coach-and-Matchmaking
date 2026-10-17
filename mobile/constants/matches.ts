import { Sport } from '../types';

export interface MatchSlotItem {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  format?: string;
  date: string;
  time: string;
  duration?: string;
  groundName: string;
  area: string;
  slotsOpen: number;
  totalSlots: number;
  skillLevel: string;
  feePerPlayer?: string;
  captainName?: string;
  captainId?: string;
  teamName?: string;
  startTime?: string;
  description?: string;
  venueNotes?: string;
  confirmedPlayers?: { id: string; name: string; isCaptain?: boolean }[];
  coordinates: { x: number; y: number }; // Presentation percentage coordinates on circuit map
}

// Re-export isolated demo fixtures for backwards compatibility in demo/storybook views
export { DEMO_MATCHES, MATCHES } from '../demo/mockMatches';
