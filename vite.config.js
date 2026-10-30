import { defineConfig } from 'vite'
import { createReadStream, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// The site is plain static HTML at the repo root and GitHub Pages serves that
// root directly, so Vite is only the local dev server here. `npm run build`
// writes to dist/ (git-ignored) and never touches the deployed files.
const root = resolve(process.cwd())

// vendor/ holds pre-minified third-party bundles. Vite's dev transform inlines
// their source maps, which turns three.min.js from 726 KiB into ~3.9 MiB on
// every reload. Serve those files byte-for-byte instead.
function serveVendorRaw() {
  return {
    name: 'serve-vendor-raw',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (!path.startsWith('/vendor/') || !path.endsWith('.js')) return next()
        const file = join(root, path)
        try {
          const info = statSync(file)
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          res.setHeader('Content-Length', String(info.size))
          createReadStream(file).pipe(res)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  root: '.',
  plugins: [serveVendorRaw()],
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
