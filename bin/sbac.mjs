#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientEntry = path.join(root, 'dist', 'index.html')

if (!existsSync(clientEntry)) {
  console.error('Client bundle is missing. Install from a complete Git checkout or run npm run build first.')
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (build.status !== 0) process.exit(build.status ?? 1)
}

const result = spawnSync(process.execPath, ['--import', 'tsx', 'server/index.ts', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)