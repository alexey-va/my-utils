import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
  },
  build: {
    chunkSizeWarningLimit: 520,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes("/node_modules/antd/")) {
            if (id.includes("/node_modules/antd/es/index.js")) {
              return undefined;
            }
            if (id.includes("/node_modules/antd/es/table/")) {
              return "vendor-antd-table";
            }
            return "vendor-antd";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/grafana": {
        target: "http://localhost:3500",
        changeOrigin: true,
      },
      "/temporal": {
        target: "http://localhost:8233",
        changeOrigin: true,
      },
    },
  },
});
