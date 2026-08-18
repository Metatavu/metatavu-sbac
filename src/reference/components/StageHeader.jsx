/**
 * StageHeader — the stage column head, with the stage operations menu.
 * Stages are first-class: insert, reorder, split and delete all restructure the
 * blueprint without the user touching layout.
 */

import React, { useState } from 'react';
import { color, font, radius, size } from '../theme.js';

export function StageHeader({ stage, index, selected, renaming, actions, canMoveLeft, canMoveRight }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const duration = stage.duration
    ? stage.duration.min === stage.duration.max
      ? `${stage.duration.min} ${stage.duration.unit}`
      : `${stage.duration.min}–${stage.duration.max} ${stage.duration.unit}`
    : 'no duration';

  const menu = [
    { label: 'Rename stage', run: () => actions.startRename('stage', stage.id) },
    { label: 'Insert stage before', run: () => actions.insertStage(index) },
    { label: 'Insert stage after', run: () => actions.insertStage(index + 1) },
    canMoveLeft && { label: 'Move left', run: () => actions.moveStage(stage.id, -1) },
    canMoveRight && { label: 'Move right', run: () => actions.moveStage(stage.id, 1) },
    { label: 'Split stage', run: () => actions.splitStage(stage.id) },
    { label: 'Hide stage', run: () => actions.setHidden('stage', stage.id, true) },
    { label: 'Delete stage', run: () => actions.deleteStage(stage.id), danger: true },
  ].filter(Boolean);

  return (
    <div
      style={{
        position: 'relative',
        width: size.cell,
        flex: 'none',
        padding: '8px 10px 10px',
        borderBottom: `1px solid ${color.border}`,
        background: selected ? color.panel : 'transparent',
        borderRadius: '8px 8px 0 0',
        boxShadow: selected ? `inset 0 0 0 1.5px ${color.accent}` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {renaming ? (
          <input
            autoFocus
            defaultValue={stage.name}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value) actions.updateStage(stage.id, { name: value });
              actions.endRename();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') actions.endRename();
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: 24,
              border: `1px solid ${color.accent}`,
              borderRadius: radius.sm,
              padding: '0 6px',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
            }}
          />
        ) : (
          <div
            onClick={(event) => {
              event.stopPropagation();
              actions.select({ kind: 'stage', id: stage.id });
            }}
            onDoubleClick={() => actions.startRename('stage', stage.id)}
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            {stage.name}
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          style={{
            width: 20,
            height: 20,
            flex: 'none',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: color.label,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ⋯
        </button>
      </div>

      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.label, marginTop: 3 }}>
        {duration}
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 6,
            zIndex: 40,
            width: 178,
            background: color.panel,
            border: `1px solid ${color.border}`,
            borderRadius: radius.xl,
            boxShadow: '0 8px 24px rgba(22, 32, 42, 0.14)',
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {menu.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                item.run();
              }}
              style={{
                textAlign: 'left',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 5,
                fontSize: 12,
                color: item.danger ? color.danger : color.inkSoft,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
