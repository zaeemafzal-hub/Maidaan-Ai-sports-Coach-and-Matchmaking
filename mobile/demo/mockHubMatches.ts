import { Sport } from '../types';

export interface ScheduledVenueMatch {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  time: string;
  court: string;
  slotsOpen: number;
  totalSlots: number;
}

export const DEMO_VENUE_MATCHES: ScheduledVenueMatch[] = [
  {
    id: 'vm-01',
    title: 'Evening 7v7 Floodlit Friendly',
    sport: 'football',
    sportLabel: 'Football',
    time: 'Tonight, 8:30 PM - 10:00 PM',
    court: 'Turf Pitch 1',
    slotsOpen: 3,
    totalSlots: 14,
  },
  {
    id: 'vm-02',
    title: 'Tape-Ball Floodlit Match',
    sport: 'cricket',
    sportLabel: 'Cricket',
    time: 'Tonight, 9:00 PM - 11:00 PM',
    court: 'Main Net A',
    slotsOpen: 4,
    totalSlots: 16,
  },
  {
    id: 'vm-03',
    title: 'Doubles Open Round',
    sport: 'padel',
    sportLabel: 'Padel',
    time: 'Tomorrow, 7:00 PM - 8:30 PM',
    court: 'Enclosed Court 2',
    slotsOpen: 1,
    totalSlots: 4,
  },
];
