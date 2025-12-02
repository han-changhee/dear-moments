// vite.config.ts (수정된 버전 - 서브 경로 배포 가정)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 서브 경로 배포를 위해 빌드 결과물의 베이스 경로를 수정합니다.
  base: '/', // 🚨 [핵심 수정]
  plugins: [vue(), mkcert()],
  server: {
    https: false,
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})