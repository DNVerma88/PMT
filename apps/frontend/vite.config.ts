import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inline the SW registration script to avoid a separate network request
      injectRegister: 'auto',
      // Manifest is in public/ — don't generate a duplicate
      manifest: false,
      workbox: {
        // Pre-cache all static build output
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API calls: NetworkFirst — show fresh data when online, cached when offline
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24 h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images / SVGs: CacheFirst (rarely change)
            urlPattern: /\.(?:png|svg|jpg|jpeg|webp|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 d
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts: CacheFirst (immutable)
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Offline fallback: serve the SPA shell for any navigation request
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Enable SW in dev so you can test offline behaviour without a production build
        enabled: false,
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@pmt/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
    },
  },

  server: {
    port: 5173,
    // Proxy all /api requests to the NestJS backend during development.
    // This ensures cookies work (same-origin) and avoids CORS issues.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    // Non-breaking security headers for the Vite dev server.
    // CSP is intentionally omitted here — Vite HMR and @vitejs/plugin-react both inject
    // inline scripts that a strict script-src 'self' would block.
    // CSP enforcement belongs on the production web server (nginx/CDN) serving the built assets.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy':
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()',
      'X-DNS-Prefetch-Control': 'off',
    },
  },

  build: {
    // Code splitting for lazy-loaded routes
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'echarts-vendor': ['echarts', 'echarts-for-react'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'query-vendor': ['@tanstack/react-query'],
          'router-vendor': ['react-router-dom'],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
