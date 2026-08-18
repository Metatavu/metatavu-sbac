import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../server/index.ts'

const apps: Awaited<ReturnType<typeof buildServer>>[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('workspace API', () => {
  it('lists, reads, and saves YAML inside its configured folder', async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'sbac-'))
    await writeFile(path.join(folder, 'checkout.yaml'), 'service:\n  name: Checkout\nstages:\n  - id: pay\nelements:\n  - id: charge\n')
    const app = await buildServer({ folder })
    apps.push(app)

    expect((await app.inject('/api/workspace')).json().files).toEqual([{ path: 'checkout.yaml', serviceName: 'Checkout', stages: 1, elements: 1 }])
    expect((await app.inject('/api/files/checkout.yaml')).json().text).toContain('Checkout')
    expect((await app.inject({ method: 'PUT', url: '/api/files/checkout.yaml', payload: { text: 'service:\n  name: Revised\n' } })).statusCode).toBe(204)
    expect(await readFile(path.join(folder, 'checkout.yaml'), 'utf8')).toContain('Revised')
    expect((await app.inject({ method: 'PUT', url: '/api/files/new-blueprint.yaml', payload: { text: 'service:\n  name: New blueprint\n' } })).statusCode).toBe(204)
    expect(await readFile(path.join(folder, 'new-blueprint.yaml'), 'utf8')).toContain('New blueprint')
  })

  it('rejects traversal outside the workspace', async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'sbac-'))
    const app = await buildServer({ folder })
    apps.push(app)
    expect((await app.inject('/api/files/%2E%2E%2Fprivate.yaml')).statusCode).toBe(400)
  })
})