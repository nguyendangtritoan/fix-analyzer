import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DICTIONARY_NAMES = ['FIX40', 'FIX41', 'FIX42', 'FIX43', 'FIX44']
const VIRTUAL_DICTIONARIES_ID = 'virtual:fix-dictionaries'
const RESOLVED_DICTIONARIES_ID = `\0${VIRTUAL_DICTIONARIES_ID}`

const bundleFixDictionaries = () => ({
  name: 'bundle-fix-dictionaries',
  resolveId(id) {
    return id === VIRTUAL_DICTIONARIES_ID ? RESOLVED_DICTIONARIES_ID : null
  },
  load(id) {
    if (id !== RESOLVED_DICTIONARIES_ID) return null

    const dictionaries = Object.fromEntries(DICTIONARY_NAMES.map(name => {
      const path = fileURLToPath(new URL(`./public/dictionaries/${name}.xml`, import.meta.url))
      return [name, readFileSync(path, 'utf8')]
    }))

    return `export default ${JSON.stringify(dictionaries)}`
  },
})

const productionContentSecurityPolicy = () => {
  let isBuild = false

  return {
    name: 'production-content-security-policy',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!isBuild) return html

        const policy = [
          "default-src 'self'",
          "connect-src 'none'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self'",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
          "frame-src 'none'",
        ].join('; ')

        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        )
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), bundleFixDictionaries(), productionContentSecurityPolicy()],
  base: '/fix-analyzer/',
})
