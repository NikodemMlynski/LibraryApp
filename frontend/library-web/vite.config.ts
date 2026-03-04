import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Nasłuchuje na wszystkich interfejsach wewnątrz kontenera
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 80, // HMR łączy się przez port Nginxa (80) z otoczenia przeglądarki
    }
  }
})