import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { Workspace } from './workspace.ts'

export async function buildServer(options: { folder: string; staticRoot?: string }) {
  const workspace = await Workspace.open(options.folder)
  const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 })

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    if (message.includes('Blueprint path') || message.includes('Only .yaml') || message.includes('Only image') || message.includes('Image files') || message.includes('Upload a supported') || message.includes('Invalid YAML')) {
      return reply.code(400).send({ error: message })
    }
    return reply.send(error)
  })

  app.get('/api/workspace', async () => ({ folder: workspace.folder, files: await workspace.list() }))
  app.get('/api/assets', async () => ({ files: await workspace.listAssets() }))
  app.get<{ Querystring: { path?: string } }>('/api/assets/file', async (request, reply) => {
    const filePath = request.query.path
    if (!filePath) return reply.code(400).send({ error: 'An asset path is required.' })
    const extension = path.extname(filePath).toLowerCase()
    const mimeType = { '.avif': 'image/avif', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extension] ?? 'application/octet-stream'
    return reply.type(mimeType).send(await workspace.readAsset(filePath))
  })
  app.post<{ Body: { name?: unknown; base64?: unknown } }>('/api/assets', async (request, reply) => {
    if (typeof request.body?.name !== 'string' || typeof request.body?.base64 !== 'string') {
      return reply.code(400).send({ error: 'An image name and base64 payload are required.' })
    }
    const content = Buffer.from(request.body.base64, 'base64')
    return reply.code(201).send({ path: await workspace.saveAsset(request.body.name, content) })
  })
  app.get<{ Params: { path: string } }>('/api/files/:path', async (request) => ({ text: await workspace.read(request.params.path) }))
  app.put<{ Params: { path: string }; Body: { text?: unknown } }>('/api/files/:path', async (request, reply) => {
    if (typeof request.body?.text !== 'string') return reply.code(400).send({ error: 'The request body needs a text string.' })
    await workspace.write(request.params.path, request.body.text)
    return reply.code(204).send()
  })

  if (options.staticRoot && existsSync(options.staticRoot)) {
    await app.register(fastifyStatic, { root: options.staticRoot, wildcard: false })
    app.setNotFoundHandler((request, reply) => request.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.sendFile('index.html'))
  }
  return app
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const folder = argument('--folder')
  if (!folder) throw new Error('Usage: sbac --folder <blueprint-folder> [--port <port>]')
  const port = Number(argument('--port') ?? 4173)
  const app = await buildServer({ folder, staticRoot: path.resolve('dist') })
  await app.listen({ port, host: '127.0.0.1' })
}