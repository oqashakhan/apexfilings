import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {handleTranslation} from './server/translate.ts';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { SEO_PAGES, canonicalUrl } from './src/lib/seo';

export default defineConfig(({mode}) => {
  const localEnv = loadEnv(mode, process.cwd(), 'GOOGLE_TRANSLATE_');
  return {
    plugins: [react(), tailwindcss(), {
      name: 'apex-static-search-pages',
      apply: 'build',
      async closeBundle() {
        const file = path.resolve('dist/index.html');
        const template = await readFile(file, 'utf8');
        const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
        for (const page of SEO_PAGES) {
          const url = canonicalUrl(page.path);
          let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`);
          for (const [selector, value] of [['name="description"', page.description], ['property="og:title"', page.title], ['property="og:description"', page.description], ['property="og:url"', url], ['name="twitter:title"', page.title], ['name="twitter:description"', page.description]]) {
            html = html.replace(new RegExp(`(<meta ${selector} content=")[^"]*("\\s*/>)`), `$1${escape(value)}$2`);
          }
          html = html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/, `$1${url}$2`);
          const fallback = `<main><h1>${escape(page.heading)}</h1><p>${escape(page.intro)}</p><nav><a href="/services/llc-formation/">LLC formation</a> · <a href="/services/registered-agent/">Registered agent</a> · <a href="/services/ein/">EIN assistance</a> · <a href="/services/mail-forwarding/">Business address</a> · <a href="/pricing/">Pricing</a> · <a href="/contact/">Contact</a></nav></main>`;
          html = html.replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
          const directory = page.path === '/' ? path.resolve('dist') : path.resolve('dist', page.path.slice(1));
          await mkdir(directory, { recursive: true });
          await writeFile(path.join(directory, 'index.html'), html);
        }
        // These routes remain functional React entry points, but should not be indexed.
        for (const route of ['/start', '/formation/start', '/consultation']) {
          const directory = path.resolve('dist', route.slice(1));
          await mkdir(directory, { recursive: true });
          const noindex = template
            .replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/, `$1${canonicalUrl(route)}$2`)
            .replace(/(<meta property="og:url" content=")[^"]*("\s*\/>)/, `$1${canonicalUrl(route)}$2`)
            .replace('</head>', '  <meta name="robots" content="noindex,follow" />\n  </head>');
          await writeFile(path.join(directory, 'index.html'), noindex);
        }
        const urls = SEO_PAGES.map(page => `  <url><loc>${canonicalUrl(page.path)}</loc></url>`).join('\n');
        await writeFile(path.resolve('dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      },
    }, {
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
