import { VenueMapProps } from "./VenueMap.types";
export function mapData(props: VenueMapProps, theme:'dark'|'light'='dark') {
  return {
    kind: "maidaan-map-update",
    points: props.points,
    center: {
      latitude: props.center?.latitude ?? 31.5204,
      longitude: props.center?.longitude ?? 74.3587,
    },
    canPick: !!props.onPick,
    theme,
  };
}
export function handleMapMessage(
  data: unknown,
  props: VenueMapProps,
  onReady: () => void,
  onError: (error: string) => void,
) {
  if (!data || typeof data !== "object") return;
  const message = data as Record<string, unknown>;
  if (message.source !== "maidaan-open-map") return;
  if (message.kind === "ready") onReady();
  if (message.kind === "error" && typeof message.message === "string")
    onError(message.message);
  if (
    message.kind === "select" &&
    typeof message.id === "string" &&
    props.points.some((point) => point.id === message.id)
  )
    props.onSelect?.(message.id);
  if (
    message.kind === "pick" &&
    typeof message.latitude === "number" &&
    typeof message.longitude === "number" &&
    Number.isFinite(message.latitude) &&
    Number.isFinite(message.longitude) &&
    Math.abs(message.latitude) <= 90 &&
    Math.abs(message.longitude) <= 180
  )
    props.onPick?.(message.latitude, message.longitude);
}
