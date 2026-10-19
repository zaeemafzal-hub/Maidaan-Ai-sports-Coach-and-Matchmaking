// Launch coverage. Enable another city here when its venue coverage is ready.
export interface ServiceCity {
  id: string;
  name: string;
  enabled: boolean;
  latitude: number;
  longitude: number;
  bounds: { south: number; north: number; west: number; east: number };
  areas: { id: string; name: string; aliases: string[] }[];
}
const names = [
  "Gulberg",
  "Gulberg I",
  "Gulberg II",
  "Gulberg III",
  "Gulberg IV",
  "Gulberg V",
  "DHA Phase 1",
  "DHA Phase 2",
  "DHA Phase 3",
  "DHA Phase 4",
  "DHA Phase 5",
  "DHA Phase 6",
  "DHA Phase 7",
  "DHA Phase 8",
  "DHA Phase 9",
  "DHA Phase 9 Prism",
  "DHA Phase 11 Rahbar",
  "Johar Town",
  "Johar Town Phase 1",
  "Johar Town Phase 2",
  "Model Town",
  "Model Town Extension",
  "Faisal Town",
  "Garden Town",
  "Muslim Town",
  "Allama Iqbal Town",
  "Lahore Cantt",
  "Cavalry Ground",
  "Askari 1",
  "Askari 5",
  "Askari 9",
  "Askari 10",
  "Askari 11",
  "Bahria Town",
  "Bahria Orchard",
  "Lake City",
  "Valencia",
  "Wapda Town",
  "Punjab University Housing Society",
  "PCSIR Housing Scheme",
  "PIA Housing Society",
  "NFC Housing Society",
  "Township",
  "Green Town",
  "Quaid-e-Azam Industrial Estate",
  "Samanabad",
  "Ichhra",
  "Shadman",
  "Shadbagh",
  "Shalimar",
  "Baghbanpura",
  "Mughalpura",
  "Harbanspura",
  "Tajpura",
  "Dharampura",
  "Garhi Shahu",
  "Gawalmandi",
  "Anarkali",
  "Walled City",
  "Ravi Road",
  "Shahdara",
  "Badami Bagh",
  "Islampura",
  "Krishan Nagar",
  "Sant Nagar",
  "Bilal Ganj",
  "Gulshan-e-Ravi",
  "Sabzazar",
  "Awan Town",
  "Mustafa Town",
  "Marghzar Colony",
  "Saidpur",
  "Thokar Niaz Baig",
  "Ali Town",
  "Chung",
  "Raiwind",
  "Jubilee Town",
  "LDA Avenue",
  "Izmir Town",
  "EME Society",
  "Pak Arab Housing Society",
  "State Life Housing Society",
  "Sui Gas Housing Society",
  "Paragon City",
  "Eden City",
  "Bedian Road",
  "Barki Road",
  "Jallo",
  "Bata Pur",
  "Manawan",
  "Al Rehman Garden",
  "Al Kabir Town",
  "Khayaban-e-Amin",
  "Ferozepur Road",
  "Raiwind Road",
  "Multan Road",
];
export const serviceCities: ServiceCity[] = [
  {
    id: "lahore",
    name: "Lahore",
    enabled: true,
    latitude: 31.5204,
    longitude: 74.3587,
    bounds: { south: 31.15, north: 31.75, west: 74.05, east: 74.65 },
    areas: names.map((name) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      aliases:
        name === "Lahore Cantt"
          ? ["Cantt", "Cantonment"]
          : name === "Punjab University Housing Society"
            ? ["PU Society"]
            : name === "DHA Phase 11 Rahbar"
              ? ["DHA Rahbar", "DHA Phase XI"]
              : name === "Johar Town"
                ? ["Johar"]
                : [],
    })),
  },
];
export const normalizeLocation = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function serviceLocation(cityId: unknown, areaId?: unknown) {
  const city = serviceCities.find((c) => c.enabled && c.id === cityId);
  const area = city?.areas.find((a) => a.id === areaId);
  return { city, area };
}
export function locationText(cityId: string, areaId: string) {
  const { city, area } = serviceLocation(cityId, areaId);
  return city && area ? `${area.name}, ${city.name}` : "";
}

// Match complete area names in an address, preferring the most specific name.
// This is a text suggestion, not a geocoded boundary check.
export function areaForAddress(cityId: unknown, address: string) {
  const { city } = serviceLocation(cityId);
  const text = ` ${normalizeLocation(address)} `;
  return city?.areas
    .flatMap((area) =>
      [area.name, ...area.aliases].map((name) => ({
        area,
        name: normalizeLocation(name),
      })),
    )
    .sort((a, b) => b.name.length - a.name.length)
    .find(({ name }) => text.includes(` ${name} `))?.area;
}
