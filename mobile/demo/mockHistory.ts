import { Sport } from '../types';

export interface PlayerMatchHistoryItem {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  format: string;
  date: string;
  venueName: string;
  status: 'completed' | 'confirmed' | 'upcoming';
}

export const DEMO_RECENT_MATCHES: PlayerMatchHistoryItem[] = [
  {
    id: 'hist-01',
    title: 'Model Town 7v7 Floodlit Match',
    sport: 'football',
    sportLabel: 'Football',
    format: '7v7 Artificial Turf',
    date: 'Yesterday · 8:30 PM',
    venueName: 'Model Town Football Turf, Pitch 1',
    status: 'completed',
  },
  {
    id: 'hist-02',
    title: 'Gulberg Floodlit Tape-Ball T10',
    sport: 'cricket',
    sportLabel: 'Cricket',
    format: 'T10 Tape-Ball (8 Overs)',
    date: '3 Days Ago · 9:00 PM',
    venueName: 'Gulberg Central Sports Nets',
    status: 'completed',
  },
  {
    id: 'hist-03',
    title: 'DHA Phase 5 Padel Doubles',
    sport: 'padel',
    sportLabel: 'Padel',
    format: '2v2 Outdoor Padel',
    date: 'Last Weekend · 7:00 PM',
    venueName: 'DHA Phase 5 Padel Club, Court B',
    status: 'completed',
  },
  {
    id: 'hist-04',
    title: 'Model Town Badminton Evening Doubles',
    sport: 'badminton',
    sportLabel: 'Badminton',
    format: 'Doubles (Best of 3)',
    date: 'Last Week · 6:30 PM',
    venueName: 'Model Town Sports Complex, Court 3',
    status: 'completed',
  },
];
