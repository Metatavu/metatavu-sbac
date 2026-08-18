type WorkspaceResponse = { files: { path: string }[] }

async function message(response: Response): Promise<string> {
  const body = await response.text()
  try {
    return (JSON.parse(body) as { error?: string }).error ?? body
  } catch {
    return body
  }
}

async function list(): Promise<string[]> {
  const response = await fetch('/api/workspace')
  if (!response.ok) throw new Error(await message(response))
  return ((await response.json()) as WorkspaceResponse).files.map((file) => file.path)
}

export function createApiFs() {
  return {
    list,
    async read(path: string): Promise<string> {
      const response = await fetch(`/api/files/${encodeURIComponent(path)}`)
      if (!response.ok) throw new Error(await message(response))
      return ((await response.json()) as { text: string }).text
    },
    async write(path: string, text: string): Promise<void> {
      const response = await fetch(`/api/files/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error(await message(response))
    },
    async exists(path: string): Promise<boolean> {
      return (await list()).includes(path)
    },
  }
}