import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// 移动端独立项目：部署在同域 /m/ 路径下（与桌面端 frontend/dist 区分）
export default defineConfig({
  base: '/m/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 离线仅缓存应用外壳（HTML/JS/CSS/字体/图标），不缓存 epub 与接口数据
      includeAssets: ['icon.png', 'apple-touch-icon.png'],
      manifest: {
        name: '蔓阅莓 · 英语阅读',
        short_name: '蔓阅莓',
        description: '专注英语阅读与生词积累',
        start_url: '/m/',
        scope: '/m/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f9f7f3',
        theme_color: '#6d8b74',
        lang: 'zh-CN',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 只预缓存构建产物（应用外壳）
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        // SPA 路由回退，但接口与书籍文件必须走网络
        navigateFallback: '/m/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        // 绝不缓存 epub 与接口响应，避免离线时拿到过期内容
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // 本地 http://localhost 也属于安全上下文，方便开发期验证安装
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 3011,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  // preview 用于本地验收 PWA（Service Worker 需要构建产物）
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['axios', 'lodash', 'epubjs'],
          antdlib: ['antd'],
        },
      },
    },
  },
})