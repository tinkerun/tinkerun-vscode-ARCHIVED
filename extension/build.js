const { build } = require('esbuild')

build({
  entryPoints: [
    './src/extension.js'
  ],
  platform: 'node',
  external: ['vscode'],
  outdir: 'build',
  bundle: true,
  watch: true,
  ...(process.env.NODE_ENV === 'production' ? {
    watch: false
  } : {})
})
