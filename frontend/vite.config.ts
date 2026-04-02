import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const previewAllowedHosts = [
    'app.thepolicyforge.com',
    'app.uat.thepolicyforge.com',
]

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
        },
    },
    preview: {
        allowedHosts: previewAllowedHosts,
    },
    build: {
        // No source maps in production — prevents users from reading the original
        // source via the browser DevTools Sources panel.
        // Change to 'hidden' if you need server-side error tracking (e.g. Sentry)
        // to map minified stack traces without exposing the map to browsers.
        sourcemap: false,

        // Explicit minification — mangles identifiers and removes dead code
        // (including all logger.* calls gated behind process.env.NODE_ENV checks).
        minify: 'esbuild',
    },
})
