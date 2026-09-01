import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { resolveAppName } from './scripts/app-name';

const appName = resolveAppName();

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-app-name-html',
      transformIndexHtml(html) {
        return html.replaceAll('%APP_NAME%', appName);
      },
    },
  ],
  define: {
    // One root APP_NAME drives all renderer chrome via getAppName()
    'import.meta.env.VITE_APP_NAME': JSON.stringify(appName),
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
