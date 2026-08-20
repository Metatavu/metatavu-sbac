/**
 * Sidebar — lane management, hidden-item restore, highlight filters, validation.
 */

import React from 'react';
import { EMOTIONS, LINES, MARKERS } from '../model/constants.js';
import { chip, color, control, font, radius, size, tintFor } from '../theme.js';
import { ChipRow, IconButton, SectionLabel } from './primitives.jsx';

const SEVERITY_COLOR = { error: color.danger, warning: color.amber, info: color.label };

export function Sidebar({ doc, ui, actions, derived }) {
  const hiddenLanes = doc.lanes.filter((lane) => lane.hidden);
  const hiddenStages = doc.stages.filter((stage) => stage.hidden);
  const warnings = derived.warnings;

  return (
    <aside
      style={{
        width: size.sidebar,
        flex: 'none',
        background: color.panel,
        borderRight: `1px solid ${color.border}`,
        overflowY: 'auto',
        paddingBottom: 24,
      }}
    >
      <section style={{ padding: '14px 14px 10px' }}>
        <SectionLabel
          action={
            <button
              type="button"
              onClick={() => actions.setStageHeadersHidden(!doc.stageHeadersHidden)}
              style={control.quiet}
            >
              {doc.stageHeadersHidden ? 'show headers' : 'hide headers'}
            </button>
          }
        >
          Lanes
        </SectionLabel>

        {doc.lanes.map((lane, index) => (
          <LaneRow
            key={lane.id}
            lane={lane}
            hasNextLane={index < doc.lanes.length - 1}
            renaming={ui.renaming?.kind === 'lane' && ui.renaming.id === lane.id}
            onRename={(label) => actions.updateLane(lane.id, { label })}
            onDividerChange={(dividerAfter) => actions.updateLane(lane.id, { dividerAfter })}
            onStartRename={() => actions.startRename('lane', lane.id)}
            onEndRename={actions.endRename}
            onToggleHidden={() => actions.setHidden('lane', lane.id, !lane.hidden)}
            onMoveUp={() => actions.moveLane(lane.id, -1)}
            onMoveDown={() => actions.moveLane(lane.id, 1)}
            onDelete={() => actions.deleteLane(lane.id)}
          />
        ))}

        {(hiddenLanes.length > 0 || hiddenStages.length > 0) && (
          <HiddenBox
            lanes={hiddenLanes}
            stages={hiddenStages}
            onRestoreLane={(id) => actions.setHidden('lane', id, false)}
            onRestoreStage={(id) => actions.setHidden('stage', id, false)}
            onShowAll={actions.showAll}
          />
        )}

        <button
          type="button"
          onClick={actions.addLane}
          style={{
            width: '100%',
            marginTop: 6,
            height: 26,
            border: `1px dashed #D3D9D4`,
            borderRadius: radius.md,
            background: 'transparent',
            cursor: 'pointer',
            color: color.muted,
            fontSize: 11,
          }}
        >
          + Add lane
        </button>
      </section>

      <Divider />

      <section style={{ padding: '12px 14px 10px' }}>
        <SectionLabel
          action={
            ui.filter ? (
              <button type="button" onClick={actions.clearFilter} style={control.quiet}>
                clear
              </button>
            ) : null
          }
        >
          Highlight
        </SectionLabel>

        <FilterGroup label="Actors">
          <ChipRow
            items={doc.actors.map((actor) => ({ value: actor.id, label: actor.name, tone: color.blue }))}
            activeValue={ui.filter?.kind === 'actor' ? ui.filter.value : null}
            onPick={(value) => actions.toggleFilter('actor', value)}
          />
        </FilterGroup>

        <FilterGroup label="Systems">
          <ChipRow
            items={doc.systems.map((system) => ({ value: system.id, label: system.name }))}
            activeValue={ui.filter?.kind === 'system' ? ui.filter.value : null}
            onPick={(value) => actions.toggleFilter('system', value)}
          />
        </FilterGroup>

        <FilterGroup label="Discovery markers">
          <ChipRow
            items={Object.entries(MARKERS).map(([value, marker]) => ({
              value,
              label: marker.label,
              tone: marker.color,
            }))}
            activeValue={ui.filter?.kind === 'marker' ? ui.filter.value : null}
            onPick={(value) => actions.toggleFilter('marker', value)}
          />
        </FilterGroup>

        <FilterGroup label="Employee emotion" last>
          <ChipRow
            items={Object.entries(EMOTIONS).map(([value, emotion]) => ({
              value,
              label: emotion.label,
              tone: emotion.color,
            }))}
            activeValue={ui.filter?.kind === 'emotion' ? ui.filter.value : null}
            onPick={(value) => actions.toggleFilter('emotion', value)}
          />
        </FilterGroup>
      </section>

      <Divider />

      <section style={{ padding: '12px 14px' }}>
        <SectionLabel>Validation · {warnings.length}</SectionLabel>
        {warnings.length === 0 ? (
          <div style={{ fontSize: 11, color: color.fainter }}>No issues found.</div>
        ) : (
          warnings.map((warning, index) => (
            <button
              key={`${warning.ref}-${index}`}
              type="button"
              onClick={() =>
                actions.select(
                  warning.elementId
                    ? { kind: 'element', id: warning.elementId }
                    : { kind: 'stage', id: warning.stageId }
                )
              }
              style={{
                display: 'flex',
                gap: 7,
                width: '100%',
                textAlign: 'left',
                border: 0,
                padding: '6px 7px',
                borderRadius: radius.md,
                cursor: 'pointer',
                marginBottom: 2,
                background: color.amberWash,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flex: 'none',
                  marginTop: 5,
                  background: SEVERITY_COLOR[warning.severity],
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: color.body }}>
                  {warning.message}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: color.fainter, marginTop: 1 }}>
                  {warning.ref}
                </div>
              </div>
            </button>
          ))
        )}
      </section>
    </aside>
  );
}

const Divider = () => <div style={{ height: 1, background: color.borderSoft, margin: '4px 0' }} />;

function FilterGroup({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 10 }}>
      <div style={{ fontSize: 10, color: color.fainter, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function LaneRow({
  lane,
  hasNextLane,
  renaming,
  onRename,
  onDividerChange,
  onStartRename,
  onEndRename,
  onToggleHidden,
  onMoveUp,
  onMoveDown,
  onDelete,
}) {
  const tint = tintFor(lane.kind);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 7,
        padding: '3px 2px',
        borderRadius: 5,
        opacity: lane.hidden ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div
          style={{
            width: 9,
            height: 9,
            flex: 'none',
            borderRadius: 2,
            background: tint.fill,
            border: `1px solid ${tint.border}`,
          }}
        />

        {renaming ? (
          <input
            autoFocus
            defaultValue={lane.label}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value) onRename(value);
              onEndRename();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') onEndRename();
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: 22,
              border: `1px solid ${color.accent}`,
              borderRadius: radius.sm,
              padding: '0 5px',
              fontSize: 12,
              outline: 'none',
            }}
          />
        ) : (
          <div
            onClick={onStartRename}
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'text',
              fontSize: 12,
            }}
          >
            {lane.label}
            {lane.sublabel ? ` · ${lane.sublabel}` : ''}
          </div>
        )}

        <div style={{ display: 'flex', gap: 1, opacity: 0.55 }}>
          <IconButton
            title="Show / hide lane"
            onClick={onToggleHidden}
            tone={lane.hidden ? color.amber : color.label}
          >
            {lane.hidden ? '◌' : '◉'}
          </IconButton>
          <IconButton title="Move up" onClick={onMoveUp}>↑</IconButton>
          <IconButton title="Move down" onClick={onMoveDown}>↓</IconButton>
          <IconButton title="Delete lane" onClick={onDelete} tone={color.danger}>✕</IconButton>
        </div>
      </div>
      {hasNextLane && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 16, fontSize: 10.5, color: color.fainter }}>
          Line below
          <select
            value={lane.dividerAfter || ''}
            onChange={(event) => onDividerChange(event.target.value)}
            style={{ ...control.select, flex: 1, height: 24, fontSize: 10.5 }}
          >
            <option value="">None</option>
            {Object.values(LINES).map((line) => <option key={line} value={line}>{line}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function HiddenBox({ lanes, stages, onRestoreLane, onRestoreStage, onShowAll }) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 9px',
        border: '1px dashed #E0D6BC',
        borderRadius: radius.lg,
        background: color.amberWash,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div style={{ ...control.sectionLabel, color: '#A08B54', letterSpacing: '0.07em' }}>
          Hidden
        </div>
        <button type="button" onClick={onShowAll} style={control.quiet}>
          show all
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {lanes.map((lane) => (
          <button
            key={lane.id}
            type="button"
            onClick={() => onRestoreLane(lane.id)}
            style={chip(false, color.amber)}
          >
            lane · {lane.label}
          </button>
        ))}
        {stages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => onRestoreStage(stage.id)}
            style={chip(false, color.amber)}
          >
            stage · {stage.name}
          </button>
        ))}
      </div>
    </div>
  );
}
