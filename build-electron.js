const esbuild = require('esbuild')
const path = require('path')

esbuild.build({
  entryPoints: [path.join(__dirname, 'electron/main.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.join(__dirname, 'dist-electron/main.js'),
  external: ['electron'],
  format: 'cjs',
  minify: false,
}).then(() => {
  console.log('Electron main process compiled successfully')
}).catch((err) => {
  console.error('Electron main process compilation failed:', err)
  process.exit(1)
})
