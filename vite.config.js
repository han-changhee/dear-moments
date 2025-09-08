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
  },
  plugins: [vue(), mkcert()],
  base: '/dear-moments/',   // 📌 레포 이름과 일치
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})