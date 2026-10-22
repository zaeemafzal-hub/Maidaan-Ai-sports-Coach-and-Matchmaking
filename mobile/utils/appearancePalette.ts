export const APP_PALETTES = {
  dark: {
    canvas: "#0C0D0E",
    surface: "#141518",
    text: "#FFFFFF",
    secondary: "#A0A5AD",
    border: "rgba(255,255,255,0.08)",
  },
  light: {
    canvas: "#F7F8F5",
    surface: "#FFFFFF",
    text: "#17251D",
    secondary: "#526057",
    border: "rgba(23,37,29,0.14)",
  },
};
type RGB = { r: number; g: number; b: number; a: number };
function rgb(value: string): RGB | null {
  const hex = /^#([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(value);
  if (hex) {
    let s = hex[1];
    if (s.length === 3)
      s = s
        .split("")
        .map((c) => c + c)
        .join("");
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
    };
  }
  const match =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(
      value,
    );
  if (match)
    return {
      r: +match[1],
      g: +match[2],
      b: +match[3],
      a: match[4] === undefined ? 1 : +match[4],
    };
  if (value === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (value === "black") return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}
const rgba = (hex: string, a: number) => {
  const c = rgb(hex)!;
  return a < 1 ? `rgba(${c.r},${c.g},${c.b},${a})` : hex;
};
const BACKGROUNDS: Record<string, string> = {
  "#0c0d0e": "#F7F8F5",
  "#050706": "#F7F8F5",
  "#101214": "#F0F2ED",
  "#141518": "#FFFFFF",
  "#111512": "#F1F3EF",
  "#1b1d22": "#ECEFE8",
  "#20232a": "#E5E9E1",
  "#22252b": "#E0E6DB",
};
export function lightColor(
  value: unknown,
  property = "color",
  keepWhite = false,
): unknown {
  if (typeof value !== "string") return value;
  if (property === "textShadowColor") return "transparent";
  const c = rgb(value);
  if (!c) return value;
  const hex =
    "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const neutral = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 36;
  if (property === "backgroundColor") {
    const exact = BACKGROUNDS[hex];
    if (exact) return rgba(exact, c.a);
    // Keep true black backdrops and bright brand/status surfaces intact.
    if (neutral && c.r > 0 && Math.max(c.r, c.g, c.b) < 65)
      return rgba("#F1F3EF", c.a);
    return value;
  }
  if (property.toLowerCase().includes("border") && neutral && c.r > 200)
    return rgba("#17251D", Math.max(c.a < 1 ? c.a : 0.14, 0.12));
  if (
    property === "color" ||
    property === "placeholderTextColor" ||
    property === "tintColor"
  ) {
    if (neutral && c.r > 210) return keepWhite ? value : rgba("#17251D", c.a);
    if (neutral && c.r >= 80 && c.r <= 210)
      return rgba(c.r < 130 ? "#657168" : "#526057", c.a);
    if (!keepWhite) {
      const semantic: Record<string, string> = {
        "#22c55e": "#15803D",
        "#ef4444": "#B91C1C",
        "#f59e0b": "#92400E",
        "#3b82f6": "#1D4ED8",
        "#ff986b": "#A83C12",
        "#ffac83": "#A83C12",
      };
      if (semantic[hex]) return rgba(semantic[hex], c.a);
    }
  }
  return value;
}
const ALIASES: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  canvas: "#0C0D0E",
  background: "#0C0D0E",
  surface: "#141518",
  "surface-card": "#141518",
  "surface-depth": "#101214",
  "surface-elevated": "#1B1D22",
  "surface-soft": "#1B1D22",
  "surface-highlight": "#22252B",
  "surface-glossy": "#20232A",
  primary: "#FFFFFF",
  secondary: "#A0A5AD",
  muted: "#5C616A",
  "content-primary": "#FFFFFF",
  "content-secondary": "#A0A5AD",
  "content-muted": "#5C616A",
  "text-primary": "#FFFFFF",
  "text-secondary": "#A0A5AD",
  "text-muted": "#5C616A",
  content: "#FFFFFF",
  graphite: "#FFFFFF",
  cloud: "#FFFFFF",
  "warm-white": "#FFFFFF",
  stone: "#A0A5AD",
  "stone-muted": "#A0A5AD",
  "stone-light": "#1B1D22",
  ink: "#0C0D0E",
  "brand-primary": "#E85D26",
  accent: "#E85D26",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  "border-subtle": "rgba(255,255,255,0.08)",
  "border-light": "rgba(255,255,255,0.12)",
};
function classColors(classes: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const token of classes.split(/\s+/)) {
    const m = /^(bg|text|border(?:-[trbl])?)-(.+)$/.exec(token);
    if (!m) continue;
    let name = m[2],
      alpha: number | undefined;
    const opacity = /\/(?:\[([\d.]+)\]|(\d+))$/.exec(name);
    if (opacity) {
      alpha = opacity[1] !== undefined ? +opacity[1] : +opacity[2] / 100;
      name = name.slice(0, opacity.index);
    }
    let color =
      name.startsWith("[") && name.endsWith("]")
        ? name.slice(1, -1).replace(/_/g, " ")
        : ALIASES[name];
    if (!color || !rgb(color)) continue;
    if (alpha !== undefined) {
      const c = rgb(color)!;
      color = `rgba(${c.r},${c.g},${c.b},${alpha})`;
    }
    const property =
      m[1] === "bg"
        ? "backgroundColor"
        : m[1] === "text"
          ? "color"
          : {
              "border-t": "borderTopColor",
              "border-b": "borderBottomColor",
              "border-l": "borderLeftColor",
              "border-r": "borderRightColor",
            }[m[1]] || "borderColor";
    result[property] = color;
  }
  return result;
}
/** Adapt legacy palette styles, including NativeWind's web CSS references. Layout and handlers are untouched. */
export function appearanceStyle(
  style: any,
  light: boolean,
  keepWhite = false,
  resolve: (id: number) => any = (id) => id,
): any {
  if (!light) return style;
  if (typeof style === "function")
    return (state: unknown) =>
      appearanceStyle(style(state), light, keepWhite, resolve);
  if (Array.isArray(style))
    return style.map((item) =>
      appearanceStyle(item, light, keepWhite, resolve),
    );
  if (typeof style === "number") {
    const resolved = resolve(style);
    return resolved === style
      ? style
      : appearanceStyle(resolved, light, keepWhite, resolve);
  }
  if (!style || typeof style !== "object") return style;
  if (style.$$css) {
    const colors = classColors(
      Object.entries(style)
        .filter(([key]) => key !== "$$css")
        .map(([, value]) => value)
        .join(" "),
    );
    return [style, appearanceStyle(colors, true, keepWhite, resolve)];
  }
  return Object.fromEntries(
    Object.entries(style).map(([key, value]) => [
      key,
      lightColor(value, key, keepWhite),
    ]),
  );
}
export function keepsLightForeground(
  style: any,
  resolve: (id: number) => any = (id) => id,
): boolean | null {
  if (Array.isArray(style)) {
    for (const item of [...style].reverse()) {
      const result = keepsLightForeground(item, resolve);
      if (result !== null) return result;
    }
    return null;
  }
  if (typeof style === "number") {
    const resolved = resolve(style);
    return resolved === style ? null : keepsLightForeground(resolved, resolve);
  }
  if (!style || typeof style !== "object") return null;
  const colors = style.$$css
    ? classColors(
        Object.entries(style)
          .filter(([key]) => key !== "$$css")
          .map(([, value]) => value)
          .join(" "),
      )
    : style;
  const c = rgb(String(lightColor(colors.backgroundColor, "backgroundColor")));
  if (!c || c.a < 0.45) return null;
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    linear(c.r) * 0.2126 + linear(c.g) * 0.7152 + linear(c.b) * 0.0722 < 0.179
  );
}
