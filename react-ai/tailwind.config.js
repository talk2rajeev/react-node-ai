/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Look for classes in all files with these extensions inside the src/ folder
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // <-- Add this line
  ],
}

