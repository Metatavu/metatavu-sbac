import { useEffect, useState } from 'react'
import { blankDocument } from './reference/model/samples.js'
import { createApiFs } from './apiFs.ts'
import { BlueprintEditor } from './BlueprintEditor.tsx'

const fs = createApiFs()

function App() {
  const [folder, setFolder] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/workspace')
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text())
        return response.json() as Promise<{ folder: string }>
      })
      .then(({ folder: workspaceFolder }) => setFolder(workspaceFolder))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to open workspace.'))
  }, [])

  if (error) return <div className="app-message">{error}</div>
  if (!folder) return <div className="app-message">Opening blueprint workspace...</div>
  return <BlueprintEditor folder={folder} fs={fs} initialDoc={blankDocument('Service blueprint')} />
}

export default App