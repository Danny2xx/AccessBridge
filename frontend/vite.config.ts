import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_TARGET = "http://127.0.0.1:8000";
const apiProxy = Object.fromEntries(
  ["/health", "/scenario", "/optimise", "/evidence"].map((path) => [path, API_TARGET])
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: {
    // maplibre-gl and deck.gl are large vendor bundles split into their own chunks.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          map: ["maplibre-gl", "react-map-gl"],
          deck: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/react"]
        }
      }
    }
  }
});
