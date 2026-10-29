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
