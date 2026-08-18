/**
 * NewBlueprintDialog — create a `.yaml` file in the controlled folder.
 * Lanes are a starting point, not a schema: every preset stays fully editable.
 */

import React, { useState } from 'react';
import { LANE_PRESETS } from '../../model/samples.js';
import { slugify } from '../../model/ids.js';
import { color, control, font, radius } from '../../theme.js';
import { Dialog } from '../primitives.jsx';

export function NewBlueprintDialog({ folder, onCreate, onClose }) {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState('blueprint');
  const [error, setError] = useState('');

  const path = name.trim()
    ? /\.ya?ml$/.test(name.trim())
      ? name.trim()
      : `${slugify(name)}.yaml`
    : '…';

  const create = async () => {
    try {
      await onCreate(name, preset);
      onClose();
    } catch (cause) {
      setError(cause.message);
    }
  };

  return (
    <Dialog title="New blueprint in this folder" onClose={onClose}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 18px',
          gap: 14,
          overflowY: 'auto',
        }}
      >
        <div>
          <div style={control.fieldLabel}>Name</div>
          <input
            autoFocus
            value={name}
            placeholder="Returns and refunds"
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
            }}
            style={{ ...control.input, height: 36, borderRadius: 8, padding: '0 11px' }}
          />
          <div style={{ fontFamily: font.mono, fontSize: 10.5, color: color.faint, marginTop: 6 }}>
            {folder}/{path}
          </div>
        </div>

        <div>
          <div style={{ ...control.fieldLabel, marginBottom: 6 }}>Starting lanes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(LANE_PRESETS).map(([key, entry]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  width: '100%',
                  padding: '9px 11px',
                  border: `1px solid ${preset === key ? color.accent : color.border}`,
                  borderRadius: radius.xl,
                  background: preset === key ? `${color.accent}0F` : color.panel,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{entry.label}</div>
                <div style={{ fontSize: 10.5, color: color.label }}>{entry.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11.5, color: color.danger }}>{error}</div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={control.secondary}>
            Cancel
          </button>
          <button type="button" onClick={create} style={control.primary}>
            Create blueprint
          </button>
        </div>
      </div>
    </Dialog>
  );
}
