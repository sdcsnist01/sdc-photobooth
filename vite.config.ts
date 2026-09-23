import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Dev-only: serves the Vercel-style handlers in /api (export function GET/POST(request))
 * from the Vite dev server, so `npm run dev` works end to end without `vercel dev`.
 * In production Vercel runs the same files itself.
 */
function apiDevServer(): Plugin {
  const apiDir = resolve(import.meta.dirname, 'api')

  // /api/booth/session -> api/booth/session.ts ; /api/gallery/<x> -> api/gallery/[token].ts
  const resolveHandler = (segments: string[]): string | null => {
    const exact = resolve(apiDir, ...segments) + '.ts'
    if (existsSync(exact)) return exact
    const dir = resolve(apiDir, ...segments.slice(0, -1))
    if (!existsSync(dir)) return null
    const dynamic = readdirSync(dir).find((f) => /^\[.+\]\.ts$/.test(f))
    return dynamic ? resolve(dir, dynamic) : null
  }

  return {
    name: 'api-dev-server',
    apply: 'serve',
    config(_, { mode }) {
      // Make server-only vars (SUPABASE_*) from .env.local visible to the handlers
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) process.env[k] ??= v
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        const segments = url.pathname.split('/').filter(Boolean).slice(1)
        const file = segments.some((s) => s.startsWith('_')) ? null : resolveHandler(segments)
        if (!file) {
          res.statusCode = 404
          res.end('Not found')
          return
        }

        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          })
          const response: Response = await handler(request)

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(String(err))
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServer()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    // Allow Cloudflare's quick-tunnel hostnames (and any *.trycloudflare.com)
    // so the dev server can be reached through `cloudflared tunnel`.
    allowedHosts: ['.trycloudflare.com'],
  },
})
