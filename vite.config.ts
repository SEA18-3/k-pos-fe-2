import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

function devCspPlugin(): Plugin {
  return {
    name: "dev-csp-transform",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(
        "connect-src 'self'",
        "connect-src 'self' http://localhost:3000 ws://localhost:5173 http://127.0.0.1:3000 ws://127.0.0.1:5173",
      )
    },
  }
}

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

export default defineConfig({
  plugins: [
    devCspPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/k-pos-icon.png", "brand/k-pos-sync-without-signal.png"],
      manifest: {
        name: "k-pos Operator",
        short_name: "k-pos",
        description: "Kasir offline-first yang tetap jalan tanpa sinyal dan sync saat terkoneksi",
        theme_color: "#09090b",
        background_color: "#09090b",
        lang: "id",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/brand/k-pos-icon.png",
            sizes: "192x192 512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["brand/k-pos-sync-without-signal.png"],
      },
    }),
  ],
  server: {
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

