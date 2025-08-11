/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ShowsTrack custom colors
        'st-primary': '#3B82F6',
        'st-secondary': '#6366F1', 
        'st-success': '#10B981',
        'st-warning': '#F59E0B',
        'st-danger': '#EF4444',
        'st-gray': '#6B7280',
        // Show states colors from specifications
        'show-programado': '#6B7280',
        'show-abierto': '#10B981',
        'show-cerrado': '#EF4444',
        'show-cancelado': '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}