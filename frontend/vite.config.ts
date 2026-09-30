import { defineConfig, ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const isDev = mode === 'development'
  return {
    plugins: [
      react(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 20480,
        deleteOriginFile: false,
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 20480,
        deleteOriginFile: false,
        compressionOptions: { level: 11 },
      }),
    ],
    server: {
      host: true,
      port: 3010,
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    esbuild: {
      drop: isDev ? [] : ['debugger', 'console'], // 移除调试语句和日志
    },
    build: {
      minify: 'terser',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            vendor: ['axios', 'lodash', 'epubjs'],
            antdlib: ['antd'],
            remixiconlib: ['@remixicon/react'],
          },
        },
      },
    },
  }
})
