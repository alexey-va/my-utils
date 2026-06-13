import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
