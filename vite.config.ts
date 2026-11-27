import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Two pages in one repo: "/" (visitors) and "/studio/" (owner). "/studio" without the slash is sent to "/studio/". */
function studioRoute(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader(k: string, v: string): void; end(): void }, next: () => void) => {
    if (req.url === '/studio' || req.url?.startsWith('/studio?')) {
      res.statusCode = 302;
      res.setHeader('Location', '/studio/');
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'studio-route',
    configureServer: (s) => void s.middlewares.use(redirect),
    configurePreviewServer: (s) => void s.middlewares.use(redirect),
  };
}

/** Fills __SITE_URL__ in index.html (share previews need an absolute address). Empty when VITE_SITE_URL is not set. */
function siteUrl(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const url = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '');
  return { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url) };
}

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves a project site from /<repo>/. The deploy workflow sets VITE_BASE=/emma-revelation/; locally it is "/".
  base: process.env.VITE_BASE || '/',
  plugins: [react(), studioRoute(), siteUrl(mode)],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        studio: fileURLToPath(new URL('./studio/index.html', import.meta.url)),
      },
      output: {
        // Keep the 3D library out of the main bundle so the first paint is fast.
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
}));
