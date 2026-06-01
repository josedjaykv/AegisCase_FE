/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Content-Security-Policy in **report-only** mode, injected as a <meta> tag in
 * the **dev** server only (`apply: 'serve'`). Report-only never blocks — it logs
 * violations to the console so we can tune the policy before enforcing.
 *
 * Production must enforce CSP via real HTTP headers at the proxy/CDN (a <meta>
 * tag can't use report-uri/report-to and shouldn't be the prod boundary), so the
 * built index.html stays clean. See docs/phases/phase-10.
 */
function devCspReportOnly(): Plugin {
  const policy = [
    `default-src 'self'`,
    // API gateway + S3 presigned media (https) + Sentry ingest (https) + Vite HMR websocket.
    `connect-src 'self' ${process.env.VITE_API_BASE_URL ?? 'http://localhost:3000'} https: ws:`,
    `img-src 'self' data: blob: https:`, // presigned image thumbnails + local upload previews
    `media-src 'self' blob: https:`, // inline <video>/<audio> from presigned URLs
    `frame-src 'self' blob: https:`, // PDF/text <iframe> from presigned URLs
    `style-src 'self' 'unsafe-inline'`, // shadcn/Tailwind inline styles
    `script-src 'self'`,
    `font-src 'self' data:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  return {
    name: 'aegiscase-dev-csp-report-only',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <meta http-equiv="Content-Security-Policy-Report-Only" content="${policy}" />\n  </head>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), devCspReportOnly()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor cores into their own long-cached chunks
        // (separate from the app code, which changes often).
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-table'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Playwright E2E lives in e2e/ and is run by `npm run test:e2e`, not Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
