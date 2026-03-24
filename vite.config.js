import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

function copyIconPlugin() {
  return {
    name: 'copy-icon',
    closeBundle() {
      try {
        mkdirSync('dist/src/assets', { recursive: true })
        copyFileSync('src/assets/icon.png', 'dist/src/assets/icon.png')
      } catch (e) {
        console.warn('Could not copy icon:', e.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './manifest.json',
    }),
    copyIconPlugin(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
