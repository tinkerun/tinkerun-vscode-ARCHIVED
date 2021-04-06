const { build } = require('esbuild')

const isProduction = process.env.NODE_ENV === 'production'

build({
  entryPoints: [
    './src/extension.ts'
  ],
  platform: 'node',
  external: ['vscode'],
  outdir: 'build',
  tsconfig: './tsconfig.json',
  bundle: true,
  watch: true,
  ...(isProduction ? {
    watch: false
  } : {})
})
