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
        ink: "#1A1C19",
        surface: "#20221F",
        "surface-card": "#272A26",
        "surface-card-border": "#D6D1C6",
        "surface-card-dark": "#272A26",
        "surface-border-dark": "#353933",
        graphite: "#242522",
        "warm-white": "#F4F1EA",
        stone: "#D6D1C6",
        "stone-light": "#E8E4DC",
        "stone-muted": "#B8B2A6",
        olive: "#3D4438",
        "olive-dark": "#2C3228",
        "olive-muted": "#525C4B",
        rust: "#875646",
        "rust-dark": "#663F33",
        "rust-muted": "#9E6A58",
        lime: "#3D4438", // Mapped to Arena Olive for brand coherence
        "lime-muted": "#525C4B",
        cloud: "#F4F1EA", // Mapped to Warm White
        "cloud-muted": "#B8B2A6", // Mapped to Concrete Stone muted
        cricket: "#875646",
        badminton: "#525C4B",
        padel: "#6E5B4B",
        football: "#3D4438",
      },
    },
  },
  plugins: [],
};
