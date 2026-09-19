import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
      "/site": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
      "/editor": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
      "/preview": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
      "/s": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  rollupOptions: {
      input: {
        main: "index.html",
        studio: "studio.html",
        createV2: "create-v2.html",
        integritet: "integritet.html",
        villkor: "villkor.html",
        validation: "validation.html",
      },
    },
  },
});
