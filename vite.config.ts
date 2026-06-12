import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/scanner-ponto/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Meu Ponto',
        short_name: 'Meu Ponto',
        description: 'Gerenciamento de registros de ponto',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/scanner-ponto/',
        start_url: '/scanner-ponto/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
},
            resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
