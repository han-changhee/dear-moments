// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    https: true,
    host: true,
    port: 5173,

    // ✅ 백엔드 서버로 API 프록시 추가
    proxy: {
      '/api': {
        target: 'http://58.121.126.75:28081', // 👉 Spring Boot 서버 주소
        changeOrigin: true,
        secure: false, // HTTPS → HTTP 프록시 허용
        // rewrite: path => path.replace(/^\/api/, ''), // 만약 백엔드가 /api prefix 없이 동작한다면 주석 해제
      },
    },
  },

  plugins: [vue(), mkcert()],

  // ✅ GitHub Pages 등에서 /dear-moments/ 경로로 배포할 경우
  base: '/dear-moments/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})