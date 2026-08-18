import { useCallback, useEffect, useState } from 'react'
import { parse, stringify } from 'yaml'
import { documentFromFile, toFile } from './reference/model/document.js'
import { blankDocument } from './reference/model/samples.js'
import { slugify } from './reference/model/ids.js'

type Filesystem = { list(): Promise<string[]>; read(path: string): Promise<string>; write(path: string, text: string): Promise<void>; exists(path: string): Promise<boolean> }

export function useWorkspace({ fs, folder, onOpen }: { fs: Filesystem; folder: string; onOpen(document: Parameters<typeof documentFromFile>[0], path: string): void }) {
  const [files, setFiles] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => setFiles(await fs.list()), [fs])
  useEffect(() => { void refresh() }, [refresh])

  const open = useCallback(async (path: string) => {
    try {
      const text = await fs.read(path)
      const document = documentFromFile(parse(text))
      setCurrentPath(path)
      setError('')
      onOpen(document, path)
    } catch (cause) {
      setError(`${path}: ${cause instanceof Error ? cause.message : 'Unable to load blueprint.'}`)
    }
  }, [fs, onOpen])

  const save = useCallback(async (document: Parameters<typeof toFile>[0], path = currentPath) => {
    if (!path) throw new Error('Choose a blueprint before saving.')
    await fs.write(path, stringify(toFile(document)))
    await refresh()
    return path
  }, [currentPath, fs, refresh])

  const create = useCallback(async (name: string, preset: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Give the blueprint a name.')
    const path = /\.ya?ml$/.test(trimmed) ? trimmed : `${slugify(trimmed)}.yaml`
    if (await fs.exists(path)) throw new Error(`${path} already exists in this folder.`)
    const title = trimmed.replace(/\.ya?ml$/, '').replace(/[-_/]+/g, ' ')
    const document = blankDocument(title.charAt(0).toUpperCase() + title.slice(1), preset)
    await fs.write(path, stringify(toFile(document)))
    await refresh()
    setCurrentPath(path)
    onOpen(document, path)
    return path
  }, [folder, fs, onOpen, refresh])

  return { folder, files, currentPath, error, open, save, create, refresh }
}