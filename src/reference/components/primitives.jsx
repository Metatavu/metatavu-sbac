/**
 * Small shared primitives. Kept deliberately thin — they exist so panels don't
 * repeat token lookups, not to build a component library.
 */

import React from 'react';
import { chip, control, color, font, radius } from '../theme.js';

export function SectionLabel({ children, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div style={control.sectionLabel}>{children}</div>
      {action}
    </div>
  );
}

export function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <div style={control.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, mono, ...rest }) {
  return (
    <input
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      style={{ ...control.input, ...(mono ? { fontFamily: font.mono, fontSize: 11 } : null) }}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, placeholder, mono }) {
  return (
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      style={{ ...control.select, ...(mono ? { fontFamily: font.mono, fontSize: 11.5 } : null) }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Row of pills where at most one is active — used for filters and pickers. */
export function ChipRow({ items, activeValue, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onPick(item.value)}
          style={chip(activeValue === item.value, item.tone)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function IconButton({ title, onClick, children, tone = color.body, width = 18 }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width,
        height: 18,
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        color: tone,
        fontSize: 10,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        padding: 2,
        background: color.wash,
        border: `1px solid #E1E5E1`,
        borderRadius: radius.lg,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          style={{
            height: 24,
            padding: '0 12px',
            border: 0,
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            background: value === option.value ? color.panel : 'transparent',
            color: value === option.value ? color.ink : color.muted,
            boxShadow: value === option.value ? '0 1px 2px rgba(22,32,42,0.12)' : 'none',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Mono({ children, style }) {
  return <span style={{ fontFamily: font.mono, ...style }}>{children}</span>;
}

/** Modal shell for the export / import / new-blueprint dialogs. */
export function Dialog({ title, onClose, toolbar, children, height = 620 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22, 32, 42, 0.34)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 720,
          maxWidth: '92vw',
          height,
          maxHeight: '86vh',
          background: color.panel,
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(22, 32, 42, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 48,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 14px',
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
          <div style={{ flex: 1 }} />
          {toolbar}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: color.muted,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
