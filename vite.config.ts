/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/*
 * Content Security Policy for the published site. Only our own scripts run, nothing is fetched from other
 * hosts, and pictures may come from the page itself or local blob:/data: URLs. Inline styles are allowed
 * because Vue binds positions and sizes as style attributes. Added at build time only: the dev server
 * injects inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: html => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// served from https://hihiyuru.github.io/cruise-door-studio/
export default defineConfig({
  base: '/cruise-door-studio/',
  plugins: [vue(), tailwindcss(), contentSecurityPolicy()],
  test: { environment: 'node' },
})
