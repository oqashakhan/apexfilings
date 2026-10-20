import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {handleTranslation} from './server/translate.ts';

export default defineConfig(({mode}) => {
  const localEnv = loadEnv(mode, process.cwd(), 'GOOGLE_TRANSLATE_');
  return {
    plugins: [react(), tailwindcss(), {
      name: 'apex-local-translation-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/translate', async (req, res) => {
          if (req.method !== 'POST') { res.writeHead(405).end(); return; }
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk));
              if (chunks.reduce((sum, part) => sum + part.length, 0) > 24000) { res.writeHead(413).end(); return; }
            }
            const request = new Request('http://localhost/api/translate', { method: 'POST', body: Buffer.concat(chunks) });
            const response = await handleTranslation(request, process.env.GOOGLE_TRANSLATE_API_KEY || localEnv.GOOGLE_TRANSLATE_API_KEY);
            res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
            res.end(await response.text());
          } catch { res.writeHead(500).end(); }
        });
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
