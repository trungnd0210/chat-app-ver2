import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bảng màu lấy cảm hứng từ Zalo
        zalo: {
          blue: "#0068FF",
          "blue-dark": "#0050C8",
          "blue-light": "#E5EFFF",
          bg: "#EBECF0",
          sidebar: "#FFFFFF",
          rail: "#0068FF",
          bubble: "#0084FF",
          "bubble-in": "#FFFFFF",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
