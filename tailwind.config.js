/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'risk-critical': '#dc2626',
        'risk-high': '#f97316',
        'risk-medium': '#eab308',
        'risk-low': '#22c55e',
      },
    },
  },
  plugins: [],
}