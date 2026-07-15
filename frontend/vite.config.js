import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.js",
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      includeAssets: ["offline.html", "manifest.json", "pwa/**/*"],
      devOptions: {
        enabled: true,
        type: "module",
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff}"],
        additionalManifestEntries: [
          { url: "/offline.html", revision: null },
          { url: "/manifest.json", revision: null },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://127.0.0.1:5000",
        changeOrigin: true,
        timeout: 180000,
        proxyTimeout: 180000,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" })
              res.end(
                JSON.stringify({
                  success: false,
                  message: "API server unavailable. Start the backend: cd backend && npm run dev",
                }),
              )
            }
          })
        },
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
})

// Vercel injects VERCEL=1. Production SPA must know the Render API origin at build time.
if (process.env.VERCEL && !process.env.VITE_API_URL?.trim()) {
  console.warn(
    "[TravelPlan] VITE_API_URL is not set on Vercel. Set it to https://<your-render-host>/api in Project → Settings → Environment Variables, then redeploy.",
  )
}
