import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import JavaScriptObfuscator from 'javascript-obfuscator'

/** Vite plugin: obfuscates listed output bundles after build. */
function obfuscatePlugin(targets) {
  return {
    name: 'vite-plugin-obfuscate',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      for (const filePath of targets) {
        const src = readFileSync(filePath, 'utf8')
        const result = JavaScriptObfuscator.obfuscate(src, {
          // Control flow — primary defence
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.5,
          // Dead code injection — noise
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.2,
          // String obfuscation
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          // Rename everything to _0x…
          identifierNamesGenerator: 'hexadecimal',
          // Must be OFF for Chrome extension CSP (no eval)
          selfDefending: false,
          // Disable debug aids
          debugProtection: false,
          sourceMap: false,
        })
        writeFileSync(filePath, result.getObfuscatedCode(), 'utf8')
        console.log(`[obfuscate] ${filePath}`)
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  envPrefix: ['VITE_', 'YEARLY_'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: mode === 'development' ? [] : [
    obfuscatePlugin([
      resolve(__dirname, 'dist/assets/content.js'),
    ]),
  ],
}))
