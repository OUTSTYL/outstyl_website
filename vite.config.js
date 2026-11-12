import { defineConfig, loadEnv } from 'vite';

// In development, serve /api/waitlist from api/waitlist.js so the form works
// with `npm run dev` too. On Vercel the same file runs as a serverless function.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/waitlist', async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { /* bad json → empty */ }
        const shim = {
          statusCode: 200,
          setHeader: (k, v) => res.setHeader(k, v),
          status(code) { this.statusCode = code; return this; },
          json(obj) { res.statusCode = this.statusCode; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return this; },
        };
        try {
          const mod = await server.ssrLoadModule('/api/waitlist.js');
          await mod.default({ method: req.method, headers: req.headers, socket: req.socket, body }, shim);
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: 'Dev API error.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [devApi()],
    // three.js is one lazy chunk loaded after first paint, so its size is expected
    build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 700 },
    server: { port: 5173 },
  };
});
