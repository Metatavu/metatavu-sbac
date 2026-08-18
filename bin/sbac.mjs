#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['--import', 'tsx', 'server/index.ts', ...process.argv.slice(2)], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
})

process.exit(result.status ?? 1)