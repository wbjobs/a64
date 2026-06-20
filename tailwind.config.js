/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: "#00f0ff",
        accent: "#ff00aa",
        "bg-dark": "#0a0e1a",
        "bg-card": "rgba(15,23,42,0.7)",
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        "neon-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.3), inset 0 0 15px rgba(34,211,238,0.15)",
            textShadow:
              "0 0 5px #00f0ff, 0 0 10px #00f0ff, 0 0 20px #00f0ff",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(34,211,238,0.8), 0 0 60px rgba(34,211,238,0.5), inset 0 0 20px rgba(34,211,238,0.25)",
            textShadow:
              "0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff",
          },
        },
        glow: {
          "0%, 100%": {
            boxShadow:
              "0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.5)",
          },
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        neon: "0 0 5px #00f0ff, 0 0 10px #00f0ff, 0 0 20px #00f0ff",
        "neon-lg":
          "0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 80px #00f0ff",
        "neon-accent": "0 0 5px #ff00aa, 0 0 10px #ff00aa, 0 0 20px #ff00aa",
        glass: "inset 0 1px 0 rgba(255,255,255,0.1)",
      },
      backgroundImage: {
        "gradient-radial":
          "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
      },
      borderColor: {
        glass: "rgba(0, 240, 255, 0.2)",
      },
    },
  },
  plugins: [],
};
