import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// Remove crossorigin attributes from script/link tags in the generated HTML.
// Electron loads via file:// which doesn't support CORS, so crossorigin causes
// module scripts to silently fail.
function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/<script([^>]*?) crossorigin([^>]*)>/g, '<script$1$2>')
        .replace(/<link([^>]*?) crossorigin([^>]*?)>/g, '<link$1$2>')
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    removeCrossorigin(),
    electron({
      main: {
        entry: 'src/main/main.js',
      },
      preload: {
        input: 'src/main/preload.js',
      },
      renderer: {},
    }),
  ],
})
