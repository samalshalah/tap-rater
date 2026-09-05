import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#5F6B76",
        line: "#DFE5E3",
        brand: "#0B7A75",
        "brand-dark": "#075E59",
        soft: "#F7F8F6",
        panel: "#F2F6F5",
        accent: "#9B5700"
      },
      borderRadius: {
        card: "8px",
        control: "8px",
        panel: "12px"
      }
    }
  },
  plugins: []
};

export default config;
