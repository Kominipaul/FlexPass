import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // basicSsl() serves the dev server over HTTPS with a self-signed cert.
  // iOS Safari only exposes navigator.mediaDevices (the QR scanner camera)
  // in a secure context, so plain http:// over the LAN can't scan.
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Bind 0.0.0.0 so the dev server is reachable from other devices
    // on the LAN (e.g. testing check-in on a phone).
    host: true,
    port: 5173,
    // The API is proxied under the same origin the page is served from.
    // That is what lets the session cookie ride along with no CORS setup,
    // and it means a phone on the LAN reaches the API through the same
    // https:// host it loaded the app from — without the API needing its
    // own certificate.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
        // Forwards X-Forwarded-Proto, so the API knows the browser's leg of
        // the connection was https and can mark the session cookie Secure.
        xfwd: true,
      },
    },
  },
})
