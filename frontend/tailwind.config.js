/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#0a0e27",
        "dark-card": "#1a1f3a",
        "red-team": "#b91c1c",
        "red-glow": "#dc2626",
        "blue-team": "#1e40af",
        "blue-glow": "#3b82f6",
        "charcoal": "#2d3748",
      },
      backgroundImage: {
        "cinema-dark": "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%)",
      },
      boxShadow: {
        "glow-red": "0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.3)",
        "glow-blue": "0 0 15px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.2)",
      },
    },
  },
  plugins: [],
}
