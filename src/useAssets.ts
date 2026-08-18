import { useCallback, useEffect, useState } from 'react'

type AssetsResponse = { files: string[] }

async function message(response: Response): Promise<string> {
  const body = await response.text()
  try {
    return (JSON.parse(body) as { error?: string }).error ?? body
  } catch {
    return body
  }
}

function asBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image.'))
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '')
    reader.readAsDataURL(file)
  })
}

export const assetUrl = (path: string) => `/api/assets/file?path=${encodeURIComponent(path)}`

export function useAssets() {
  const [files, setFiles] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const response = await fetch('/api/assets')
    if (!response.ok) throw new Error(await message(response))
    setFiles(((await response.json()) as AssetsResponse).files)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const upload = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
    const response = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: file.name, base64: await asBase64(file) }),
    })
    if (!response.ok) throw new Error(await message(response))
    const path = ((await response.json()) as { path: string }).path
    await refresh()
    return path
  }, [refresh])

  return { files, refresh, upload }
}