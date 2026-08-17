import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/compos-icon.png", "brand/compos-sync-without-signal.png"],
      manifest: {
        name: "COMPOS Operator",
        short_name: "COMPOS",
        description: "Kasir offline-first yang tetap jalan tanpa sinyal dan sync saat terkoneksi",
        theme_color: "#09090b",
        background_color: "#09090b",
        lang: "id",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/brand/compos-icon.png",
            sizes: "1254x1254",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["brand/compos-sync-without-signal.png"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
