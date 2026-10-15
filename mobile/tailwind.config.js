/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cinematic Obsidian & Solar Orange Core Palette
        canvas: "#0C0D0E",
        background: "#0C0D0E",
        "surface-depth": "#101214",
        surface: "#141518",
        "surface-card": "#141518",
        "surface-elevated": "#1B1D22",
        "surface-glossy": "#20232A",
        "surface-soft": "#1B1D22",
        "surface-highlight": "#22252B",
        "surface-translucent": "rgba(20, 21, 24, 0.88)",

        // Brand Solar Orange
        "brand-orange": "#E85D26",
        "brand-orange-hover": "#FF723A",
        "brand-glow": "rgba(232, 93, 38, 0.28)",
        "brand-soft": "rgba(232, 93, 38, 0.14)",
        "brand-ambient": "rgba(232, 93, 38, 0.08)",
        "brand-ambient-strong": "rgba(232, 93, 38, 0.16)",

        // Athletic Sports Accents
        accent: "#E85D26",
        "accent-dark": "#D44A15",
        "accent-soft": "rgba(232, 93, 38, 0.14)",
        "accent-glow": "rgba(232, 93, 38, 0.28)",
        secondary: "#7FD1AE",
        "secondary-soft": "rgba(127, 209, 174, 0.14)",
        warm: "#E85D26",
        "warm-soft": "rgba(232, 93, 38, 0.14)",

        // Borders
        "border-subtle": "rgba(255, 255, 255, 0.08)",
        "border-light": "rgba(255, 255, 255, 0.12)",
        "border-card": "rgba(255, 255, 255, 0.08)",
        "border-active": "#E85D26",

        // Direct Typography Aliases (ensures text-primary, text-secondary, text-muted always produce high contrast)
        primary: "#FFFFFF",
        secondary: "#A0A5AD",
        muted: "#5C616A",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A0A5AD",
        "text-muted": "#5C616A",
        "text-inverse": "#0C0D0E",

        // Semantic Content Aliases (ensures text-content-primary, etc. always work)
        content: {
          DEFAULT: "#FFFFFF",
          primary: "#FFFFFF",
          secondary: "#A0A5AD",
          muted: "#5C616A",
          inverse: "#0C0D0E",
        },

        // Functional & Advisory Status
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        verified: "#3B82F6",
        "outdoor-suitable": "#22C55E",
        caution: "#F59E0B",
        "indoor-preferred": "#EF4444",

        // 4 Core Sports Identities
        cricket: "#F4A261",
        badminton: "#7FD1AE",
        padel: "#64B5F6",
        football: "#22C55E",

        // Brand Aliases
        "brand-primary": "#E85D26",
        "brand-hover": "#FF723A",

        // Backward compatibility mappings - Never allow legacy aliases to render near-black text
        graphite: "#FFFFFF", // Neutralized: legacy text-graphite resolves to crisp white
        "warm-white": "#FFFFFF",
        stone: "#A0A5AD",
        "stone-light": "#1B1D22",
        "stone-muted": "#A0A5AD", // Neutralized: legacy text-stone-muted resolves to light silver
        olive: "#22C55E",
        "olive-dark": "#16A34A",
        "olive-muted": "#7FD1AE",
        rust: "#E85D26",
        "rust-dark": "#D44A15",
        "rust-muted": "#FF723A",
        ink: "#0C0D0E",
        "surface-card-border": "rgba(255, 255, 255, 0.08)",
        "surface-card-dark": "#141518",
        "surface-border-dark": "rgba(255, 255, 255, 0.08)",
        lime: "#E85D26",
        "lime-muted": "#7FD1AE",
        cloud: "#FFFFFF",
        "cloud-muted": "#AEB6BE",
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
