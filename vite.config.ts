import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/r6world/apps/pm/',
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3009',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
})

