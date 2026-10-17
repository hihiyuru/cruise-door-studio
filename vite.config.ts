/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// served from https://hihiyuru.github.io/cruise-door-studio/
export default defineConfig({
  base: '/cruise-door-studio/',
  plugins: [vue(), tailwindcss()],
  test: { environment: 'node' },
})
