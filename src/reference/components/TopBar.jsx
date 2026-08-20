/**
 * TopBar — workspace file menu, save state, mode switch, zoom, import/export.
 * Presentational: everything arrives as props.
 */

import React, { useState } from 'react';
import { color, control, font, radius, size } from '../theme.js';
import { Mono, Segmented } from './primitives.jsx';

export function TopBar({
  serviceName,
  folder,
  currentPath,
  files,
  dirty,
  mode,
  zoom,
  onOpenFile,
  onNewBlueprint,
  onRenameFile,
  onRenameService,
  onSave,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onImport,
  onExport,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingService, setRenamingService] = useState(false);

  const finishRename = (value) => {
    const name = value.trim();
    if (name) onRenameService(name);
    setRenamingService(false);
  };

  return (
    <header
      style={{
        height: size.topBar,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 14px',
        background: color.panel,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, position: 'relative' }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: color.ink,
            color: color.panel,
            fontFamily: font.mono,
            fontSize: 11,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          sb
        </div>

        {renamingService ? (
          <input
            autoFocus
            defaultValue={serviceName}
            aria-label="Blueprint title"
            onBlur={(event) => finishRename(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setRenamingService(false);
            }}
            style={{ ...control.input, width: 220, height: 30, fontWeight: 600 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid transparent',
              borderRadius: radius.lg,
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 8px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em' }}>{serviceName}</div>
              <Mono style={{ fontSize: 10, color: '#7B8794' }}>
                {currentPath} {dirty ? '●' : ''}
              </Mono>
            </div>
            <div style={{ color: color.label, fontSize: 9 }}>▾</div>
          </button>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          style={{
            ...control.secondary,
            height: 30,
            border: `1px solid ${dirty ? color.ink : color.border}`,
            background: dirty ? color.panel : color.panelSoft,
            color: dirty ? color.ink : color.faint,
            cursor: dirty ? 'pointer' : 'default',
          }}
        >
          {dirty ? 'Save' : 'Saved'}
        </button>

        {menuOpen && (
          <FileMenu
            folder={folder}
            files={files}
            currentPath={currentPath}
            dirty={dirty}
            onOpenFile={(path) => {
              setMenuOpen(false);
              onOpenFile(path);
            }}
            onNewBlueprint={() => {
              setMenuOpen(false);
              onNewBlueprint();
            }}
            onRenameService={() => {
              setMenuOpen(false);
              setRenamingService(true);
            }}
            onRenameFile={async (name) => {
              const path = await onRenameFile(currentPath, name);
              setMenuOpen(false);
              return path;
            }}
          />
        )}
      </div>

      <Segmented
        value={mode}
        onChange={onModeChange}
        options={[
          { value: 'workshop', label: 'Workshop' },
          { value: 'model', label: 'Model' },
        ]}
      />

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: '1px solid #E1E5E1',
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <ZoomButton onClick={onZoomOut}>−</ZoomButton>
        <Mono style={{ width: 46, textAlign: 'center', fontSize: 11, color: color.body }}>
          {Math.round(zoom * 100)}%
        </Mono>
        <ZoomButton onClick={onZoomIn}>+</ZoomButton>
        <button
          type="button"
          onClick={onZoomReset}
          style={{
            height: 28,
            padding: '0 9px',
            border: 0,
            borderLeft: `1px solid ${color.borderSoft}`,
            background: color.panel,
            cursor: 'pointer',
            color: color.body,
            fontSize: 11,
          }}
        >
          Fit
        </button>
      </div>

      <button type="button" onClick={onImport} style={{ ...control.secondary, height: 30 }}>
        Import
      </button>
      <button type="button" onClick={onExport} style={{ ...control.primary, height: 30 }}>
        Export
      </button>
    </header>
  );
}

function ZoomButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        border: 0,
        background: color.panel,
        cursor: 'pointer',
        color: color.body,
      }}
    >
      {children}
    </button>
  );
}

function FileMenu({ folder, files, currentPath, dirty, onOpenFile, onNewBlueprint, onRenameService, onRenameFile }) {
  const [renamingFile, setRenamingFile] = useState(false);
  const [fileName, setFileName] = useState(currentPath.split('/').pop());
  const [renameError, setRenameError] = useState('');

  const renameFile = async () => {
    try {
      await onRenameFile(fileName);
      setRenameError('');
    } catch (cause) {
      setRenameError(cause instanceof Error ? cause.message : 'Unable to rename blueprint.');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        left: 26,
        zIndex: 70,
        width: 306,
        background: color.panel,
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        boxShadow: '0 12px 34px rgba(22, 32, 42, 0.16)',
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px 8px' }}>
        <div style={control.sectionLabel}>Folder</div>
        <Mono
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 10.5,
            color: '#7B8794',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            direction: 'rtl',
            textAlign: 'left',
          }}
        >
          {folder}
        </Mono>
      </div>

      {files.map((file) => {
        const active = file.path === currentPath;
        return (
          <button
            key={file.path}
            type="button"
            onClick={() => onOpenFile(file.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              textAlign: 'left',
              border: 0,
              background: active ? color.wash : 'transparent',
              cursor: 'pointer',
              padding: '7px 9px',
              borderRadius: radius.md,
              fontSize: 12,
              color: color.inkSoft,
            }}
          >
            <div
              style={{
                width: 10,
                flex: 'none',
                fontSize: 9,
                color: active && dirty ? color.amber : color.faint,
              }}
            >
              {active && dirty ? '●' : active ? '▸' : ''}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Mono
                style={{
                  fontSize: 11.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 236,
                }}
              >
                {file.path}
              </Mono>
              <div style={{ fontSize: 10, color: color.faint }}>{file.meta}</div>
            </div>
          </button>
        );
      })}

      <div style={{ height: 1, background: color.borderSoft, margin: '4px 2px' }} />
      <button
        type="button"
        onClick={onRenameService}
        style={{
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '7px 9px 7px 27px',
          borderRadius: radius.md,
          fontSize: 12,
          color: color.inkSoft,
        }}
      >
        Rename blueprint…
      </button>
      {renamingFile ? (
        <div style={{ padding: '5px 9px 3px' }}>
          <input
            autoFocus
            value={fileName}
            aria-label="Blueprint file name"
            onChange={(event) => setFileName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void renameFile();
              if (event.key === 'Escape') setRenamingFile(false);
            }}
            style={{ ...control.input, height: 28, fontSize: 11.5 }}
          />
          {renameError && <div style={{ marginTop: 4, fontSize: 10.5, color: color.danger }}>{renameError}</div>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRenamingFile(true)}
          style={{
            textAlign: 'left',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            padding: '7px 9px 7px 27px',
            borderRadius: radius.md,
            fontSize: 12,
            color: color.inkSoft,
          }}
        >
          Rename file…
        </button>
      )}
      <button
        type="button"
        onClick={onNewBlueprint}
        style={{
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '7px 9px 7px 27px',
          borderRadius: radius.md,
          fontSize: 12,
          color: color.accent,
        }}
      >
        + New blueprint…
      </button>
    </div>
  );
}
