/**
 * ExportDialog — one dialog, five representations of the same model:
 * YAML and JSON (the machine-readable source) and SVG/PNG/PDF (for sharing).
 */

import React, { useMemo, useState } from 'react';
import { renderSvg } from '../../model/renderSvg.js';
import { exportPdf, exportPng, exportSvg, svgDataUrl } from '../../model/exporters.js';
import { chip, color, control, font, tab } from '../../theme.js';
import { Dialog } from '../primitives.jsx';

const FORMATS = ['YAML', 'JSON', 'SVG', 'PNG', 'PDF'];

export function ExportDialog({ doc, yaml, json, basename, imageSources, onClose }) {
  const [format, setFormat] = useState('YAML');
  const [options, setOptions] = useState({ images: true, connections: true, metadata: false });
  const [scale, setScale] = useState(2);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const isText = format === 'YAML' || format === 'JSON';
  const renderOptions = useMemo(() => ({ ...options, imageSources }), [options, imageSources]);
  const rendered = useMemo(
    () => (isText ? null : renderSvg(doc, renderOptions)),
    [doc, isText, renderOptions]
  );

  const text = format === 'YAML' ? yaml : json;

  const download = async () => {
    try {
      if (format === 'SVG') setMessage(exportSvg(doc, renderOptions, basename));
      else if (format === 'PNG') setMessage(await exportPng(doc, renderOptions, basename, scale));
      else setMessage(exportPdf(doc, renderOptions, basename));
    } catch (cause) {
      setMessage(cause.message);
    }
  };

  return (
    <Dialog
      title={`Export · ${basename}`}
      onClose={onClose}
      toolbar={
        <>
          <div style={{ display: 'flex', gap: 2, padding: 2, background: color.wash, borderRadius: 6 }}>
            {FORMATS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  setFormat(entry);
                  setMessage('');
                  setCopied(false);
                }}
                style={tab(format === entry)}
              >
                {entry}
              </button>
            ))}
          </div>
          {isText && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(text);
                setCopied(true);
              }}
              style={{ ...control.secondary, height: 28, padding: '0 11px' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </>
      }
    >
      {isText ? (
        <pre
          style={{
            flex: 1,
            margin: 0,
            overflow: 'auto',
            padding: '16px 18px',
            fontFamily: font.mono,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: color.inkSoft,
            background: '#FBFCFB',
          }}
        >
          {text}
        </pre>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              background: '#F4F6F4',
              padding: 16,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <img
              src={svgDataUrl(rendered.svg)}
              alt="Blueprint preview"
              style={{
                maxWidth: '100%',
                background: color.panel,
                border: `1px solid ${color.borderHair}`,
                borderRadius: 6,
              }}
            />
          </div>

          <div
            style={{
              flex: 'none',
              borderTop: `1px solid ${color.borderSoft}`,
              padding: '12px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={control.sectionLabel}>Include</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  ['images', 'Evidence images'],
                  ['connections', 'Connections'],
                  ['metadata', 'Status metadata'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
                      setMessage('');
                    }}
                    style={chip(options[key])}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {format === 'PNG' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={control.sectionLabel}>Scale</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setScale(value)}
                        style={chip(scale === value, color.blue)}
                      >
                        {value}×
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: font.mono, fontSize: 10.5, color: color.faint }}>
                {rendered.width} × {rendered.height} px
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: color.green,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {message}
              </div>
              <button type="button" onClick={download} style={control.primary}>
                {format === 'PDF' ? 'Open print view' : `Download ${format}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
