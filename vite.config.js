import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // 监听所有网络接口
    port: 3000, // 可选，指定端口号
    open: true, // 可选，自动在浏览器中打开
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon_180.png", "vite.svg"],
      manifest: {
        name: "chickenCross",
        short_name: "chickenCross",
        description: "小鸡过马路",
        theme_color: "#646cff",
        background_color: "#242424",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon_512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable_192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "maskable_512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
        ],
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "./src/styles/variables.scss" as *;`,
        // additionalData: `@import "./src/styles/variables.scss";`
      },
    },
  },
});
