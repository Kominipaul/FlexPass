import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy makes the browser see the API as same-origin
// (localhost:5173/api/...), which is also the intended production shape:
// a reverse proxy in front routing /api/* to the Go service and
// everything else to these static files. That keeps auth cookies simple
// in both environments without relying on cross-site cookie behavior.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/healthz': 'http://localhost:8080',
    },
  },
})
