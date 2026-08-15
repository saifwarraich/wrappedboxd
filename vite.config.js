import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

function copyIconPlugin(isFirefox) {
  const outDir = isFirefox ? 'dist-firefox' : 'dist'
  return {
    name: 'copy-icon',
    closeBundle() {
      try {
        mkdirSync(`${outDir}/src/assets`, { recursive: true })
        copyFileSync('src/assets/icon.png', `${outDir}/src/assets/icon.png`)
      } catch (e) {
        console.warn('Could not copy icon:', e.message)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox'

  return {
    plugins: [
      webExtension({
        manifest: './manifest.json',
        transformManifest: (manifest) => {
          if (isFirefox) {
            manifest.browser_specific_settings = {
              gecko: {
                id: 'wrappedboxd@unboxd-proxy.vercel.app',
                strict_min_version: '140.0',
                data_collection_permissions: {
                  required: ['websiteContent'],
                  optional: [],
                },
              },
              gecko_android: {
                strict_min_version: '142.0',
              },
            }
          }
          return manifest
        },
      }),
      copyIconPlugin(isFirefox),
    ],
    build: {
      outDir: isFirefox ? 'dist-firefox' : 'dist',
      emptyOutDir: true,
    },
  }
})
