/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Website brand palette — copied from frontend/tailwind.config.js (Phase 3: 2026-03-17).
                // Independently editable: www.thepolicyforge.com may adopt its own marketing palette
                // without touching the app's design tokens.
                brand: {
                    50:  '#edfbf8',
                    100: '#c8f1ea',
                    200: '#8edfcf',
                    300: '#6ed4bf',
                    400: '#5dcbb5',
                    500: '#56c8b1',
                    600: '#3aad97',
                    700: '#2a8a78',
                    800: '#216b5e',
                    900: '#174c43',
                },
            },
        },
    },
    plugins: [],
}
