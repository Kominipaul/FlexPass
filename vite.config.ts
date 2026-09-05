import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'node:path'

// Applied to `vite preview` (the actual production build, served as-is —
// unlike `vite dev`, there's no HMR client or dev-time transform to worry
// about breaking). A production deployment's real host (static hosting,
// reverse proxy, CDN) needs to send the equivalent headers itself; this is
// what they should match.
//
// script-src has no 'unsafe-inline'/'unsafe-eval': the app ships zero inline
// <script> tags and no eval()/Function() anywhere (verified against source).
// style-src needs 'unsafe-inline' because components use React's `style={{}}`
// prop, which renders as inline style="" attributes — a much lower-risk
// allowance than script-src, since it can leak style-based information at
// worst, not execute arbitrary JS.
// connect-src/img-src/font-src stay 'self' plus exactly the Google Fonts
// hosts index.html pulls from — nothing else this app talks to.
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
  // Explicitly allow the one browser feature this app actually uses (the
  // scanner's camera) same-origin, and deny the rest that a member/staff
  // page has no reason to ever request.
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()',
}

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
  preview: {
    headers: securityHeaders,
  },
})
