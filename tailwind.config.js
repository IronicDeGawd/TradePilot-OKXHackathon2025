/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        dark: {
          bg: "#0a0e1a",
          card: "#111827",
          border: "#374151",
        },
        border: "#374151",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "dropdown-open": "dropdownOpen 0.2s ease-out forwards",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dropdownOpen: {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(-10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(79, 209, 197, 0.2)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 0 6px rgba(79, 209, 197, 0)",
          },
        },
      },
      backgroundImage: {
        "gradient-solana": "linear-gradient(to right, #8c66fc, #9945ff)",
        "gradient-ethereum": "linear-gradient(to right, #3498db, #2980b9)",
        "gradient-demo": "linear-gradient(to right, #00c853, #009688)",
        "gradient-connect":
          "linear-gradient(to right, #4a4ad9, #6b46c1, #9333ea)",
        "gradient-nav":
          "linear-gradient(to right, rgb(15, 23, 42), rgb(17, 24, 39), rgb(10, 14, 26))",
      },
    },
  },
  plugins: [],
};
