/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './docs/index.html',
    './docs/assets/js/**/*.js',
    './scripts/build-index.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};
