/**
 * ImportDialog — load a YAML blueprint. Parsing is validated up front and errors
 * are reported verbatim, so a malformed file never half-loads.
 */

import React, { useState } from 'react';
import { documentFromFile } from '../../model/document.js';
import { countEntries, parseYaml } from '../../model/yaml.js';
import { color, control, font } from '../../theme.js';
import { Dialog, Mono } from '../primitives.jsx';

export function ImportDialog({ currentYaml, onLoad, onClose }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    try {
      onLoad(documentFromFile(parseYaml(text), text, countEntries));
      onClose();
    } catch (cause) {
      setError(`Validation failed: ${cause.message}`);
    }
  };

  return (
    <Dialog title="Import · service-blueprint.yaml" onClose={onClose}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <p style={{ padding: '12px 16px 0', fontSize: 12, color: color.muted, margin: 0 }}>
          Paste a <Mono>service-blueprint.yaml</Mono>. The canvas is rebuilt from the file — the
          editor keeps no representation the YAML cannot reconstruct.
        </p>

        <textarea
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          style={{
            flex: 1,
            margin: '12px 16px',
            border: `1px solid ${color.border}`,
            borderRadius: 8,
            padding: 12,
            fontFamily: font.mono,
            fontSize: 11.5,
            lineHeight: 1.6,
            outline: 'none',
            resize: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 14px' }}>
          <div style={{ fontSize: 11.5, color: color.danger }}>{error}</div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => {
              setText(currentYaml);
              setError('');
            }}
            style={control.secondary}
          >
            Paste current
          </button>
          <button type="button" onClick={load} style={control.primary}>
            Load blueprint
          </button>
        </div>
      </div>
    </Dialog>
  );
}
