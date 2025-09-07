// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    https: true,   // mkcert 사용할 때 필수 (로컬 HTTPS)
    host: true,    // 동일 네트워크 다른 기기에서도 접속
    port: 5173,
  },
  plugins: [vue(), mkcert()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // ✅ '@' => src
    },
  },
})