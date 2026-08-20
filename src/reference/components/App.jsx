/**
 * App — composition root.
 *
 * Wires the workspace folder to the editor: state comes from `useBlueprint`,
 * files from `useWorkspace`, and the four panes below are presentational.
 * Global keyboard shortcuts live here because they are application-level.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useBlueprint } from '../state/useBlueprint.js';
import { useWorkspace } from '../state/useWorkspace.js';
import { TopBar } from './TopBar.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Canvas } from './Canvas.jsx';
import { PropertiesPanel } from './PropertiesPanel.jsx';
import { ExportDialog } from './dialogs/ExportDialog.jsx';
import { ImportDialog } from './dialogs/ImportDialog.jsx';
import { NewBlueprintDialog } from './dialogs/NewBlueprintDialog.jsx';
import { color } from '../theme.js';

/**
 * @param {Object} props
 * @param {import('../model/document.js').BlueprintDocument} props.initialDoc
 * @param {string} props.folder    the directory passed on the command line
 * @param {string} props.initialPath
 * @param {Object} props.fs        see useWorkspace for the contract
 * @param {(element, lane) => React.ReactNode} [props.renderImageSlot]
 *        host hook for evidence photos (a file picker in the desktop shell)
 */
export function App({ initialDoc, folder, initialPath, fs, renderImageSlot }) {
  const { doc, ui, actions, derived } = useBlueprint(initialDoc);
  const [dialog, setDialog] = useState(null);

  const workspace = useWorkspace({
    fs,
    folder,
    onOpen: useCallback((nextDoc) => actions.load(nextDoc), [actions]),
  });
  const currentPath = workspace.currentPath || initialPath;
  const basename = currentPath.replace(/^.*\//, '').replace(/\.ya?ml$/, '');

  const save = useCallback(async () => {
    await workspace.save(doc, currentPath);
    actions.markSaved();
  }, [actions, currentPath, doc, workspace]);

  /* Application shortcuts: Cmd/Ctrl-S saves, Delete removes the selection,
     Escape cancels an in-flight connection or menu. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        actions.cancelConnect();
        actions.closeQuickAdd();
        return;
      }
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (ui.selection?.kind === 'connection') {
          event.preventDefault();
          actions.deleteConnection(ui.selection.index);
        } else if (ui.selection?.kind === 'element') {
          event.preventDefault();
          actions.deleteElement(ui.selection.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, save, ui.selection]);

  const files = workspace.files.map((path) => ({
    path,
    meta: path === currentPath ? `${doc.stages.length} stages · ${doc.elements.length} elements` : '',
  }));

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: color.canvas,
        color: color.ink,
        fontSize: 13,
        overflow: 'hidden',
      }}
    >
      <TopBar
        serviceName={doc.service.name}
        folder={folder}
        currentPath={currentPath}
        files={files}
        dirty={ui.dirty}
        mode={ui.mode}
        zoom={ui.zoom}
        onOpenFile={workspace.open}
        onNewBlueprint={() => setDialog('new')}
        onRenameFile={workspace.rename}
        onRenameService={actions.renameService}
        onSave={save}
        onModeChange={actions.setMode}
        onZoomIn={() => actions.setZoom(ui.zoom + 0.1)}
        onZoomOut={() => actions.setZoom(ui.zoom - 0.1)}
        onZoomReset={() => actions.setZoom(1)}
        onImport={() => setDialog('import')}
        onExport={() => setDialog('export')}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar doc={doc} ui={ui} actions={actions} derived={derived} />
        <Canvas
          doc={doc}
          ui={ui}
          actions={actions}
          derived={derived}
          renderImageSlot={renderImageSlot}
        />
        <PropertiesPanel doc={doc} ui={ui} actions={actions} derived={derived} />
      </div>

      {ui.connectFrom && (
        <ConnectBanner
          label={derived.elementsById.get(ui.connectFrom)?.label || ui.connectFrom}
          onCancel={actions.cancelConnect}
        />
      )}

      {dialog === 'export' && (
        <ExportDialog
          doc={doc}
          yaml={derived.yaml}
          json={derived.json}
          basename={basename}
          imageSources={{}}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'import' && (
        <ImportDialog
          currentYaml={derived.yaml}
          onLoad={actions.load}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'new' && (
        <NewBlueprintDialog
          folder={folder}
          onCreate={workspace.create}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function ConnectBanner({ label, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 46,
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: color.ink,
        color: color.panel,
        padding: '9px 10px 9px 16px',
        borderRadius: 999,
        fontSize: 12,
        boxShadow: '0 10px 30px rgba(22, 32, 42, 0.28)',
      }}
    >
      <div>Connecting from “{label}” — click the target element</div>
      <button
        type="button"
        onClick={onCancel}
        style={{
          height: 24,
          padding: '0 10px',
          border: '1px solid rgba(255,255,255,0.28)',
          borderRadius: 999,
          background: 'transparent',
          color: color.panel,
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        Esc to cancel
      </button>
    </div>
  );
}
