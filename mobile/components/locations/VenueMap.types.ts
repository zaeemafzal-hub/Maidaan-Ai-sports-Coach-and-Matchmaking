export interface MapPoint {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
}
export interface VenueMapProps {
  points: MapPoint[];
  center?: { latitude: number; longitude: number };
  onSelect?: (id: string) => void;
  onPick?: (latitude: number, longitude: number) => void;
  onUnavailable?: () => void;
}
