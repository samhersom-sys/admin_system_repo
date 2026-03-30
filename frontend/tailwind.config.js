/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#edfbf8',
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
