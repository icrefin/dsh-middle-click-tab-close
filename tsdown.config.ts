import type { UserConfig } from 'tsdown'

/**
 * Browser-half bundler: emits `lib/client.js` in the module loader's factory
 * form. The `id` in the banner MUST equal the package name — it is the boot
 * graph row id, and a mismatch makes the module system reject the bundle with
 * "loaded without registering <id>".
 *
 * This browser half imports nothing, so the bundle needs no platform seeds and
 * no runtime dependencies; the entry is plain `.ts`, not `.tsx`.
 */
export default {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: { neverBundle: ['react', 'react/jsx-runtime'] },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-middle-click-tab-close", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
} satisfies UserConfig
