/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          primary: '#005EB8', // NHS Blue
          secondary: '#41B6E6', // Light blue
          accent: '#ED8B00', // Orange for alerts/warnings
          success: '#009639', // Green for positive outcomes
          danger: '#DA291C', // Red for emergencies/critical
          neutral: '#425563', // Dark blue-gray for text
          light: '#E8EDEE', // Light gray for backgrounds
          dark: '#003087', // Dark blue for headers
        },
      },
      fontFamily: {
        sans: ['Frutiger', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Frutiger', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'clinical': '0 4px 6px -1px rgba(0, 94, 184, 0.1), 0 2px 4px -1px rgba(0, 94, 184, 0.06)',
      },
    },
  },
  plugins: [],
}