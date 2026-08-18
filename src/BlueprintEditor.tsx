import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlueprint } from './reference/state/useBlueprint.js'
import { useWorkspace } from './useWorkspace.ts'
import { TopBar } from './reference/components/TopBar.jsx'
import { Sidebar } from './reference/components/Sidebar.jsx'
import { Canvas } from './reference/components/Canvas.jsx'
import { PropertiesPanel } from './reference/components/PropertiesPanel.jsx'
import { ExportDialog } from './reference/components/dialogs/ExportDialog.jsx'
import { ImportDialog } from './reference/components/dialogs/ImportDialog.jsx'
import { NewBlueprintDialog } from './reference/components/dialogs/NewBlueprintDialog.jsx'
import { color } from './reference/theme.js'
import { assetUrl, useAssets } from './useAssets.ts'

type Filesystem = { list(): Promise<string[]>; read(path: string): Promise<string>; write(path: string, text: string): Promise<void>; exists(path: string): Promise<boolean> }
type BlueprintEditorProps = { initialDoc: Parameters<typeof useBlueprint>[0]; folder: string; fs: Filesystem }

export function BlueprintEditor({ initialDoc, folder, fs }: BlueprintEditorProps) {
  const { doc, ui, actions, derived } = useBlueprint(initialDoc)
  const selection = ui.selection as { kind: 'connection'; index: number } | { kind: 'element'; id: string } | null
  const [dialog, setDialog] = useState<string | null>(null)
  const assets = useAssets()
  const initiallyOpened = useRef(false)
  const workspace = useWorkspace({ fs, folder, onOpen: useCallback((nextDoc: object) => actions.load(nextDoc), [actions]) })
  const currentPath = workspace.currentPath || workspace.files[0] || 'untitled.yaml'
  const basename = currentPath.replace(/^.*\//, '').replace(/\.ya?ml$/, '')

  useEffect(() => {
    if (!initiallyOpened.current && workspace.files.length > 0) {
      initiallyOpened.current = true
      void workspace.open(workspace.files[0])
    }
  }, [workspace])

  const save = useCallback(async () => {
    await workspace.save(doc, currentPath)
    actions.markSaved()
  }, [actions, currentPath, doc, workspace])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        actions.cancelConnect()
        actions.closeQuickAdd()
        return
      }
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selection?.kind === 'connection') actions.deleteConnection(selection.index)
        if (selection?.kind === 'element') actions.deleteElement(selection.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, save, selection])

  const files = workspace.files.map((path: string) => ({ path, meta: path === currentPath ? `${doc.stages.length} stages · ${doc.elements.length} elements` : '' }))
  const imageSources = Object.fromEntries(doc.elements.filter((element: { image?: string }) => element.image).map((element: { id: string; image: string }) => [element.id, assetUrl(element.image)]))
  const renderImageSlot = (element: { image?: string }, lane: { kind: string }) => lane.kind === 'evidence' && element.image
    ? <img src={assetUrl(element.image)} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 48, marginBottom: 6, borderRadius: 3, objectFit: 'cover', pointerEvents: 'none' }} />
    : undefined

  return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: color.canvas, color: color.ink, fontSize: 13, overflow: 'hidden' }}>
    <TopBar serviceName={doc.service.name} folder={folder} currentPath={currentPath} files={files} dirty={ui.dirty} mode={ui.mode} zoom={ui.zoom} onOpenFile={workspace.open} onNewBlueprint={() => setDialog('new')} onSave={() => void save()} onModeChange={actions.setMode} onZoomIn={() => actions.setZoom(ui.zoom + 0.1)} onZoomOut={() => actions.setZoom(ui.zoom - 0.1)} onZoomReset={() => actions.setZoom(1)} onImport={() => setDialog('import')} onExport={() => setDialog('export')} />
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}><Sidebar doc={doc} ui={ui} actions={actions} derived={derived} /><Canvas doc={doc} ui={ui} actions={actions} derived={derived} renderImageSlot={renderImageSlot} /><PropertiesPanel doc={doc} ui={ui} actions={actions} derived={derived} assetFiles={assets.files as never[]} onUploadAsset={assets.upload} assetUrl={assetUrl} /></div>
    {ui.connectFrom && <ConnectBanner label={derived.elementsById.get(ui.connectFrom)?.label || ui.connectFrom} onCancel={actions.cancelConnect} />}
    {dialog === 'export' && <ExportDialog doc={doc} yaml={derived.yaml} json={derived.json} basename={basename} imageSources={imageSources} onClose={() => setDialog(null)} />}
    {dialog === 'import' && <ImportDialog currentYaml={derived.yaml} onLoad={actions.load} onClose={() => setDialog(null)} />}
    {dialog === 'new' && <NewBlueprintDialog folder={folder} onCreate={workspace.create} onClose={() => setDialog(null)} />}
  </div>
}

function ConnectBanner({ label, onCancel }: { label: string; onCancel(): void }) {
  return <div style={{ position: 'fixed', left: '50%', bottom: 46, transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, background: color.ink, color: color.panel, padding: '9px 10px 9px 16px', borderRadius: 999, fontSize: 12, boxShadow: '0 10px 30px rgba(22, 32, 42, 0.28)' }}><div>Connecting from &ldquo;{label}&rdquo; - click the target element</div><button type="button" onClick={onCancel} style={{ height: 24, padding: '0 10px', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, background: 'transparent', color: color.panel, cursor: 'pointer', fontSize: 11 }}>Cancel</button></div>
}