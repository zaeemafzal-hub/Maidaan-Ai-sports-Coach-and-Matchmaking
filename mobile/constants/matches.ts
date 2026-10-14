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

export const MATCHES: MatchSlotItem[] = [
  {
    id: 'm-01',
    title: 'Model Town 7v7 Evening Floodlit',
    sport: 'football',
    sportLabel: 'Football',
    format: '7v7 Artificial Turf',
    date: 'Tonight',
    time: '8:30 PM - 10:00 PM',
    duration: '90 Mins',
    groundName: 'Model Town Football Turf, Pitch 1',
    area: 'Model Town, Lahore',
    slotsOpen: 3,
    totalSlots: 14,
    skillLevel: 'Intermediate',
    feePerPlayer: 'Rs. 450',
    captainName: 'Capt. Bilal',
    captainId: 'c-01',
    description: 'Evening 7v7 friendly on floodlit artificial turf. Looking for 3 committed outfield players to complete two balanced squads. Bibs and match balls provided on arrival.',
    venueNotes: 'Pitch 1 is located adjacent to the main clubhouse. Changing rooms and parking available on-site.',
    confirmedPlayers: [
      { id: 'p-01', name: 'Bilal R.', isCaptain: true },
      { id: 'p-02', name: 'Zaeem K.' },
      { id: 'p-03', name: 'Ahmed S.' },
      { id: 'p-04', name: 'Hamza T.' },
      { id: 'p-05', name: 'Fahad M.' },
      { id: 'p-06', name: 'Daniyal N.' },
      { id: 'p-07', name: 'Saad W.' },
      { id: 'p-08', name: 'Omar A.' },
      { id: 'p-09', name: 'Mustafa K.' },
      { id: 'p-10', name: 'Ali H.' },
      { id: 'p-11', name: 'Shahmir L.' },
    ],
    coordinates: { x: 34, y: 56 },
  },
  {
    id: 'm-02',
    title: 'Gulberg Floodlit Tape-Ball T10',
    sport: 'cricket',
    sportLabel: 'Cricket',
    format: 'T10 Tape-Ball (8 Overs/Side)',
    date: 'Tonight',
    time: '9:00 PM - 11:00 PM',
    duration: '120 Mins',
    groundName: 'Gulberg Central Sports Nets',
    area: 'Gulberg, Lahore',
    slotsOpen: 4,
    totalSlots: 16,
    skillLevel: 'All levels',
    feePerPlayer: 'Rs. 300',
    captainName: 'Capt. Usman',
    captainId: 'c-02',
    description: 'Fast-paced night tape-ball match under floodlights. Looking for 4 enthusiastic players for both batting and bowling rotations. Quality tape-balls provided.',
    venueNotes: 'Central cricket nets behind Main Boulevard. Arrive 15 minutes before first ball for toss and team distribution.',
    confirmedPlayers: [
      { id: 'p-20', name: 'Usman G.', isCaptain: true },
      { id: 'p-21', name: 'Kashif B.' },
      { id: 'p-22', name: 'Tariq M.' },
      { id: 'p-23', name: 'Naveed S.' },
      { id: 'p-24', name: 'Salman P.' },
      { id: 'p-25', name: 'Junaid Q.' },
      { id: 'p-26', name: 'Waleed F.' },
      { id: 'p-27', name: 'Babar T.' },
      { id: 'p-28', name: 'Shoaib R.' },
      { id: 'p-29', name: 'Haris N.' },
      { id: 'p-30', name: 'Zohaib D.' },
      { id: 'p-31', name: 'Imran A.' },
    ],
    coordinates: { x: 52, y: 36 },
  },
  {
    id: 'm-03',
    title: 'DHA Phase 5 Padel Doubles',
    sport: 'padel',
    sportLabel: 'Padel',
    format: 'Doubles (Best of 3 Sets)',
    date: 'Tomorrow',
    time: '7:00 PM - 8:30 PM',
    duration: '90 Mins',
    groundName: 'Lahore Padel Club, Court 2',
    area: 'DHA Phase 5, Lahore',
    slotsOpen: 1,
    totalSlots: 4,
    skillLevel: 'Advanced',
    feePerPlayer: 'Rs. 1,200',
    captainName: 'Capt. Hamza',
    captainId: 'c-03',
    description: 'High-tempo advanced padel doubles round. Need 1 strong player with consistent wall play and volley control. Premium Bullpadel balls supplied.',
    venueNotes: 'Enclosed panoramic glass court 2. Non-marking court shoes strictly required.',
    confirmedPlayers: [
      { id: 'p-40', name: 'Hamza F.', isCaptain: true },
      { id: 'p-41', name: 'Raza K.' },
      { id: 'p-42', name: 'Shehroz A.' },
    ],
    coordinates: { x: 73, y: 48 },
  },
  {
    id: 'm-04',
    title: 'Cantt Indoor Badminton Doubles',
    sport: 'badminton',
    sportLabel: 'Badminton',
    format: 'Men Doubles (21 Points x 3)',
    date: 'Tomorrow',
    time: '8:00 PM - 9:30 PM',
    duration: '90 Mins',
    groundName: 'Garrison Sports Complex, Court 3',
    area: 'Cantt, Lahore',
    slotsOpen: 2,
    totalSlots: 4,
    skillLevel: 'Intermediate',
    feePerPlayer: 'Rs. 350',
    captainName: 'Capt. Zaeem',
    captainId: 'c-04',
    description: 'Indoor wooden court doubles session. Looking for 2 active intermediate players comfortable with fast-paced doubles rotations. Feather shuttles provided.',
    venueNotes: 'Indoor hall court 3 with synthetic flooring. Locker rooms and drinking water available.',
    confirmedPlayers: [
      { id: 'p-50', name: 'Zaeem C.', isCaptain: true },
      { id: 'p-51', name: 'Adeel M.' },
    ],
    coordinates: { x: 63, y: 20 },
  },
  {
    id: 'm-05',
    title: 'Johar Town 5v5 Futsal Turf',
    sport: 'football',
    sportLabel: 'Football',
    format: '5v5 Small-Sided Futsal',
    date: 'Wednesday',
    time: '9:30 PM - 11:00 PM',
    duration: '90 Mins',
    groundName: 'Johar Town Arena Turf',
    area: 'Johar Town, Lahore',
    slotsOpen: 2,
    totalSlots: 10,
    skillLevel: 'Beginner',
    feePerPlayer: 'Rs. 400',
    captainName: 'Capt. Farhan',
    captainId: 'c-05',
    description: 'Casual midweek 5v5 futsal. Friendly atmosphere, beginners and returning players welcome. Flat turf shoes recommended.',
    venueNotes: 'Opposite Expo Centre. Pitch 2 under LED floodlights.',
    confirmedPlayers: [
      { id: 'p-60', name: 'Farhan J.', isCaptain: true },
      { id: 'p-61', name: 'Rehan S.' },
      { id: 'p-62', name: 'Danish L.' },
      { id: 'p-63', name: 'Moeen B.' },
      { id: 'p-64', name: 'Waqas A.' },
      { id: 'p-65', name: 'Umair R.' },
      { id: 'p-66', name: 'Asad H.' },
      { id: 'p-67', name: 'Talha K.' },
    ],
    coordinates: { x: 22, y: 72 },
  },
  {
    id: 'm-06',
    title: 'Cantt Weekend Badminton Quad',
    sport: 'badminton',
    sportLabel: 'Badminton',
    format: 'Doubles Round-Robin',
    date: 'Saturday',
    time: '7:00 PM - 8:30 PM',
    duration: '90 Mins',
    groundName: 'Garrison Sports Complex, Court 1',
    area: 'Cantt, Lahore',
    slotsOpen: 0,
    totalSlots: 4,
    skillLevel: 'Advanced',
    feePerPlayer: 'Rs. 350',
    captainName: 'Capt. Asim',
    captainId: 'c-06',
    description: 'Competitive doubles round robin. All player slots currently filled.',
    venueNotes: 'Court 1 main wooden arena.',
    confirmedPlayers: [
      { id: 'p-70', name: 'Asim K.', isCaptain: true },
      { id: 'p-71', name: 'Taimoor R.' },
      { id: 'p-72', name: 'Faizan S.' },
      { id: 'p-73', name: 'Qasim N.' },
    ],
    coordinates: { x: 65, y: 22 },
  },
];
