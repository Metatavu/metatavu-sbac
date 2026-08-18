import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseDocument } from 'yaml'

export type BlueprintSummary = {
  path: string
  serviceName: string
  stages: number
  elements: number
}

const isYaml = (filePath: string) => /\.ya?ml$/i.test(filePath)
const isImage = (filePath: string) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(filePath)

export class Workspace {
  readonly folder: string

  private constructor(folder: string) {
    this.folder = folder
  }

  static async open(folder: string): Promise<Workspace> {
    const resolved = await realpath(folder)
    const metadata = await stat(resolved)
    if (!metadata.isDirectory()) throw new Error(`Not a directory: ${folder}`)
    return new Workspace(resolved)
  }

  private resolve(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\0')) {
      throw new Error('A relative blueprint path is required.')
    }
    const resolved = path.resolve(this.folder, relativePath)
    const relative = path.relative(this.folder, resolved)
    if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
      throw new Error('Blueprint path must stay inside the workspace folder.')
    }
    if (!isYaml(resolved)) throw new Error('Only .yaml and .yml blueprints are supported.')
    return resolved
  }

  private assertInside(pathToCheck: string): void {
    const relative = path.relative(this.folder, pathToCheck)
    if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
      throw new Error('Blueprint path must stay inside the workspace folder.')
    }
  }

  private async resolveExisting(relativePath: string): Promise<string> {
    const resolved = await realpath(this.resolve(relativePath))
    this.assertInside(resolved)
    return resolved
  }

  async list(): Promise<BlueprintSummary[]> {
    const files: string[] = []
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true })
      await Promise.all(entries.map(async (entry) => {
        const absolutePath = path.join(directory, entry.name)
        if (entry.isDirectory()) return visit(absolutePath)
        if (entry.isFile() && isYaml(entry.name)) files.push(absolutePath)
      }))
    }
    await visit(this.folder)
    return Promise.all(files.sort().map(async (absolutePath) => {
      const text = await readFile(absolutePath, 'utf8')
      const document = parseDocument(text).toJSON() as { service?: { name?: unknown }; stages?: unknown[]; elements?: unknown[] }
      return {
        path: path.relative(this.folder, absolutePath),
        serviceName: typeof document.service?.name === 'string' ? document.service.name : path.basename(absolutePath),
        stages: Array.isArray(document.stages) ? document.stages.length : 0,
        elements: Array.isArray(document.elements) ? document.elements.length : 0,
      }
    }))
  }

  async read(relativePath: string): Promise<string> {
    return readFile(await this.resolveExisting(relativePath), 'utf8')
  }

  async write(relativePath: string, text: string): Promise<void> {
    const document = parseDocument(text)
    if (document.errors.length) throw new Error(`Invalid YAML: ${document.errors[0].message}`)

    try {
      await writeFile(await this.resolveExisting(relativePath), text, 'utf8')
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        throw error
      }
      const newPath = this.resolve(relativePath)
      this.assertInside(await realpath(path.dirname(newPath)))
      await writeFile(newPath, text, 'utf8')
    }
  }

  async listAssets(): Promise<string[]> {
    const assetsFolder = path.join(this.folder, 'assets')
    try {
      await stat(assetsFolder)
    } catch {
      return []
    }

    const files: string[] = []
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true })
      await Promise.all(entries.map(async (entry) => {
        const filePath = path.join(directory, entry.name)
        if (entry.isDirectory()) return visit(filePath)
        if (entry.isFile() && isImage(entry.name)) files.push(filePath)
      }))
    }
    await visit(assetsFolder)
    return files.sort().map((filePath) => path.relative(this.folder, filePath))
  }

  async readAsset(relativePath: string): Promise<Buffer> {
    if (!relativePath.startsWith('assets/') || !isImage(relativePath)) {
      throw new Error('Only image files under assets/ are supported.')
    }
    const resolved = await realpath(path.resolve(this.folder, relativePath))
    this.assertInside(resolved)
    return readFile(resolved)
  }

  async saveAsset(name: string, content: Buffer): Promise<string> {
    const filename = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-')
    if (!filename || filename === '.' || !isImage(filename)) {
      throw new Error('Upload a supported image file.')
    }
    if (content.length === 0 || content.length > 10 * 1024 * 1024) {
      throw new Error('Image files must be between 1 byte and 10 MB.')
    }

    const assetsFolder = path.join(this.folder, 'assets')
    await mkdir(assetsFolder, { recursive: true })
    this.assertInside(await realpath(assetsFolder))

    const extension = path.extname(filename)
    const stem = path.basename(filename, extension)
    let candidate = filename
    let index = 2
    while (true) {
      try {
        await stat(path.join(assetsFolder, candidate))
        candidate = `${stem}-${index}${extension}`
        index += 1
      } catch {
        break
      }
    }

    await writeFile(path.join(assetsFolder, candidate), content)
    return path.posix.join('assets', candidate)
  }
}