import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// A new id for every build. The app has it baked in (__APP_VERSION__), and the build also writes
// it to /version.json. An open app compares the two to notice that a newer version was deployed.
const BUILD_ID = Date.now().toString(36)

/** Writes dist/version.json during `npm run build`. */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: BUILD_ID }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), versionFile()],
  build: {
    // Firestore's SDK is one ~450 kB chunk on its own (about 130 kB gzipped). It only loads
    // with the table page, so the default 500 kB warning is raised a little for it.
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        // Libraries get chunks of their own. They change far less often than the app, so after
        // a deploy a returning player's browser still has them cached (assets are cached forever,
        // see firebase.json) and only downloads the app code that changed. Firestore and Motion
        // stay in the lazily loaded table chunk, so the lobby doesn't pay for them.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)[\\/]/,
            },
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase[\\/](app|auth|functions|util|component|logger)|idb)[\\/]/,
            },
            // Only the table page uses these two, so their chunks load with it, not the lobby.
            {
              name: 'firestore',
              test: /node_modules[\\/](@firebase[\\/](firestore|webchannel-wrapper)|re2js)[\\/]/,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
            },
          ],
        },
      },
    },
  },
  define: {
    // 'dev' while running `npm run dev`, where there's nothing to update to.
    __APP_VERSION__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['shared/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
}))
