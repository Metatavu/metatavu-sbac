/**
 * PropertiesPanel — the inspector. Four shapes depending on the selection:
 * nothing, a stage, a connection, or an element.
 *
 * Workshop mode shows only what a workshop needs (label, position, marker,
 * emotion, photo, note). Model mode adds the engineering metadata. Both edit the
 * same document — there is no separate engineering copy.
 */

import React from 'react';
import {
  CONNECTION_TYPES,
  DURATION_UNITS,
  ELEMENT_TYPES,
  EMOTIONS,
  MARKERS,
  STATUSES,
} from '../model/constants.js';
import { chip, color, control, font, radius, size, strokeFor } from '../theme.js';
import { ChipRow, Field, Mono, SectionLabel, Select, TextInput } from './primitives.jsx';

export function PropertiesPanel({ doc, ui, actions, derived }) {
  const { selection } = ui;

  return (
    <aside
      style={{
        width: size.properties,
        flex: 'none',
        background: color.panel,
        borderLeft: `1px solid ${color.border}`,
        overflowY: 'auto',
      }}
    >
      {!selection && <ServiceSummary doc={doc} />}

      {selection?.kind === 'stage' && (
        <StageForm stage={derived.stagesById.get(selection.id)} actions={actions} />
      )}

      {selection?.kind === 'connection' && (
        <ConnectionForm
          connection={doc.connections[selection.index]}
          index={selection.index}
          derived={derived}
          actions={actions}
        />
      )}

      {selection?.kind === 'element' && (
        <ElementForm
          element={derived.elementsById.get(selection.id)}
          doc={doc}
          ui={ui}
          actions={actions}
          derived={derived}
        />
      )}
    </aside>
  );
}

function Panel({ title, action, children }) {
  return (
    <div style={{ padding: '18px 16px 40px' }}>
      <SectionLabel action={action}>{title}</SectionLabel>
      {children}
    </div>
  );
}

function ServiceSummary({ doc }) {
  return (
    <Panel title="Properties">
      <p style={{ fontSize: 12, color: color.faint, lineHeight: 1.5, margin: 0 }}>
        Select an element or a stage to edit it. Drag elements between cells to change their stage
        and lane — position is semantic, never pixels. To draw an arrow, click the ⤳ handle on an
        element, then click the element it relates to.
      </p>

      <div style={{ marginTop: 18, borderTop: `1px solid ${color.borderSoft}`, paddingTop: 14 }}>
        <SectionLabel>Service</SectionLabel>
        <SummaryRow label="id" value={doc.service.id} />
        <SummaryRow label="lanes" value={doc.lanes.length} />
        <SummaryRow label="stages" value={doc.stages.length} />
        <SummaryRow label="elements" value={doc.elements.length} />
      </div>
    </Panel>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: color.label }}>{label}</span>
      <Mono>{value}</Mono>
    </div>
  );
}

function StageForm({ stage, actions }) {
  if (!stage) return null;
  const duration = stage.duration || { min: 0, max: 0, unit: 'minutes' };
  const setDuration = (patch) =>
    actions.updateStage(stage.id, { duration: { ...duration, ...patch } });

  return (
    <Panel title="Stage">
      <Field label="Name">
        <TextInput value={stage.name} onChange={(name) => actions.updateStage(stage.id, { name })} />
      </Field>

      <Field label="Description">
        <textarea
          rows={3}
          value={stage.description || ''}
          onChange={(event) => actions.updateStage(stage.id, { description: event.target.value })}
          style={control.textarea}
        />
      </Field>

      <Field label="Duration">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={stage.duration ? duration.min : ''}
            onChange={(event) => setDuration({ min: parseInt(event.target.value, 10) || 0 })}
            style={{ ...control.input, width: 62, fontFamily: font.mono }}
          />
          <input
            value={stage.duration ? duration.max : ''}
            onChange={(event) => setDuration({ max: parseInt(event.target.value, 10) || 0 })}
            style={{ ...control.input, width: 62, fontFamily: font.mono }}
          />
          <select
            value={duration.unit}
            onChange={(event) => setDuration({ unit: event.target.value })}
            style={{ ...control.select, flex: 1 }}
          >
            {DURATION_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div style={{ ...control.mono, paddingTop: 12, borderTop: `1px solid ${color.borderSoft}` }}>
        stage: {stage.id}
      </div>
    </Panel>
  );
}

function ConnectionForm({ connection, index, derived, actions }) {
  if (!connection) return null;
  const labelOf = (id) => derived.elementsById.get(id)?.label || id;

  return (
    <Panel
      title="Connection"
      action={
        <button
          type="button"
          onClick={() => actions.deleteConnection(index)}
          style={{ ...control.quiet, color: color.danger }}
        >
          Delete
        </button>
      }
    >
      <div
        style={{
          border: `1px solid ${color.borderSoft}`,
          borderRadius: radius.xl,
          padding: '10px 12px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 12.5 }}>{labelOf(connection.from)}</div>
        <div style={{ fontSize: 11, color: color.label }}>↓</div>
        <div style={{ fontSize: 12.5 }}>{labelOf(connection.to)}</div>
      </div>

      <Field label="Semantic type">
        <Select
          mono
          value={connection.type}
          onChange={(type) => actions.updateConnection(index, { type })}
          options={CONNECTION_TYPES.map((type) => ({ value: type, label: type }))}
        />
      </Field>

      <button
        type="button"
        onClick={() => actions.updateConnection(index, { bidirectional: !connection.bidirectional })}
        style={{
          ...control.secondary,
          height: 30,
          border: `1px solid ${connection.bidirectional ? color.accent : color.border}`,
          background: connection.bidirectional ? color.accent : color.panel,
          color: connection.bidirectional ? color.panel : color.body,
        }}
      >
        ⇄ Codependency (double arrow)
      </button>

      <p style={{ fontSize: 11, color: color.fainter, lineHeight: 1.5, marginTop: 12 }}>
        Routing is computed from the model — there is no connector geometry to edit. Press Delete to
        remove the selected connection.
      </p>
    </Panel>
  );
}

function ElementForm({ element, doc, ui, actions, derived }) {
  if (!element) return null;
  const lane = derived.lanesById.get(element.lane);
  const patch = (fields) => actions.updateElement(element.id, fields);

  const connections = doc.connections
    .map((connection, index) => ({ connection, index }))
    .filter(({ connection }) => connection.from === element.id || connection.to === element.id);

  return (
    <Panel
      title={`${lane?.label || element.lane} · ${element.type}`}
      action={
        <button
          type="button"
          onClick={() => actions.deleteElement(element.id)}
          style={{ ...control.quiet, color: color.danger }}
        >
          Delete
        </button>
      }
    >
      <Field label="Label">
        <TextInput value={element.label} onChange={(label) => patch({ label })} />
      </Field>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Field label="Stage" style={{ flex: 1, marginBottom: 0 }}>
          <Select
            value={element.stage}
            onChange={(stage) => patch({ stage })}
            options={doc.stages.map((entry) => ({ value: entry.id, label: entry.name }))}
          />
        </Field>
        <Field label="Lane" style={{ flex: 1, marginBottom: 0 }}>
          <Select
            value={element.lane}
            onChange={(value) => patch({ lane: value })}
            options={doc.lanes.map((entry) => ({
              value: entry.id,
              label: entry.sublabel ? `${entry.label} · ${entry.sublabel}` : entry.label,
            }))}
          />
        </Field>
      </div>

      <Field label="Marker">
        <ChipRow
          items={[
            { value: '', label: 'None', tone: color.label },
            ...Object.entries(MARKERS).map(([value, marker]) => ({
              value,
              label: marker.label,
              tone: marker.color,
            })),
          ]}
          activeValue={element.marker || ''}
          onPick={(marker) => patch({ marker })}
        />
      </Field>

      <Field label="Employee emotion">
        <ChipRow
          items={[
            { value: '', label: 'None', tone: color.label },
            ...Object.entries(EMOTIONS).map(([value, emotion]) => ({
              value,
              label: emotion.label,
              tone: emotion.color,
            })),
          ]}
          activeValue={element.emotion || ''}
          onPick={(emotion) => patch({ emotion })}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => patch({ image: element.image ? '' : 'assets/' })}
          style={{
            ...control.secondary,
            height: 30,
            border: `1px solid ${element.image ? color.accent : color.border}`,
            background: element.image ? color.accent : color.panel,
            color: element.image ? color.panel : color.body,
          }}
        >
          ▣ Photo
        </button>
        <div style={{ fontSize: 10.5, color: color.faint, lineHeight: 1.35 }}>
          Stored as a path in the blueprint folder, so images version with the YAML.
        </div>
      </div>

      {element.image !== undefined && element.image !== '' && (
        <Field label="Image path">
          <TextInput
            mono
            value={element.image}
            placeholder="assets/store-receipt.jpg"
            onChange={(image) => patch({ image })}
          />
        </Field>
      )}

      <Field label="Note">
        <textarea
          rows={2}
          value={element.note || ''}
          placeholder="Workshop annotation shown on the card"
          onChange={(event) => patch({ note: event.target.value })}
          style={control.textarea}
        />
      </Field>

      <Field label="Metric">
        <div style={{ display: 'flex', gap: 6 }}>
          <TextInput
            value={element.metricName}
            placeholder="avg handling time"
            onChange={(metricName) => patch({ metricName })}
          />
          <TextInput
            mono
            value={element.metricValue}
            placeholder="4 min"
            onChange={(metricValue) => patch({ metricValue })}
            style={{ ...control.input, width: 84 }}
          />
        </div>
      </Field>

      {ui.mode === 'model' && (
        <div style={{ borderTop: `1px solid ${color.borderSoft}`, paddingTop: 14 }}>
          <SectionLabel>Model</SectionLabel>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Field label="Type" style={{ flex: 1, marginBottom: 0 }}>
              <Select
                value={element.type}
                onChange={(type) => patch({ type })}
                options={ELEMENT_TYPES.map((type) => ({ value: type, label: type }))}
              />
            </Field>
            <Field label="Status" style={{ flex: 1, marginBottom: 0 }}>
              <Select
                placeholder="—"
                value={element.status}
                onChange={(status) => patch({ status })}
                options={STATUSES.map((status) => ({ value: status, label: status }))}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Field label="Actor" style={{ flex: 1, marginBottom: 0 }}>
              <Select
                placeholder="—"
                value={element.actor}
                onChange={(actor) => patch({ actor })}
                options={doc.actors.map((actor) => ({ value: actor.id, label: actor.name }))}
              />
            </Field>
            <Field label="System" style={{ flex: 1, marginBottom: 0 }}>
              <Select
                placeholder="—"
                value={element.system}
                onChange={(system) => patch({ system })}
                options={doc.systems.map((system) => ({ value: system.id, label: system.name }))}
              />
            </Field>
          </div>

          <Field label="Owner / team">
            <TextInput
              value={element.owner}
              placeholder="checkout-team"
              onChange={(owner) => patch({ owner })}
            />
          </Field>

          <Field label="Source reference">
            <TextInput
              mono
              value={element.sourcePath}
              placeholder="src/orders/createOrder.ts"
              onChange={(sourcePath) => patch({ sourcePath })}
            />
          </Field>

          <Field label="Telemetry event">
            <TextInput
              mono
              value={element.telemetry}
              placeholder="checkout_payment_started"
              onChange={(telemetry) => patch({ telemetry })}
            />
          </Field>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${color.borderSoft}`, paddingTop: 14 }}>
        <SectionLabel
          action={
            <button
              type="button"
              onClick={() => actions.startConnect(element.id)}
              style={control.quiet}
            >
              ⤳ Connect to…
            </button>
          }
        >
          Connections
        </SectionLabel>

        {connections.length === 0 ? (
          <div style={{ fontSize: 11, color: color.fainter, lineHeight: 1.5 }}>
            No connections yet. Click the ⤳ handle on this card, then click the element it relates to.
          </div>
        ) : (
          connections.map(({ connection, index }) => {
            const otherId = connection.from === element.id ? connection.to : connection.from;
            const arrow = connection.bidirectional ? '⇄' : connection.from === element.id ? '→' : '←';
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flex: 'none',
                    background: strokeFor(connection.type),
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {arrow} {derived.elementsById.get(otherId)?.label || otherId}
                </div>
                <select
                  value={connection.type}
                  onChange={(event) => actions.updateConnection(index, { type: event.target.value })}
                  style={{
                    width: 96,
                    height: 22,
                    border: '1px solid #E1E5E1',
                    borderRadius: 5,
                    background: color.panel,
                    fontFamily: font.mono,
                    fontSize: 9.5,
                    padding: '0 2px',
                    outline: 'none',
                  }}
                >
                  {CONNECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Codependency (double arrow)"
                  onClick={() =>
                    actions.updateConnection(index, { bidirectional: !connection.bidirectional })
                  }
                  style={{
                    ...chip(Boolean(connection.bidirectional)),
                    width: 20,
                    height: 22,
                    padding: 0,
                    borderRadius: 5,
                  }}
                >
                  ⇄
                </button>
                <button
                  type="button"
                  onClick={() => actions.deleteConnection(index)}
                  style={{
                    width: 18,
                    height: 22,
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: color.danger,
                    fontSize: 11,
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <pre
        style={{
          ...control.mono,
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${color.borderSoft}`,
          lineHeight: 1.6,
        }}
      >
{`- id: ${element.id}
  stage: ${element.stage}
  lane: ${element.lane}
  type: ${element.type}`}
      </pre>
    </Panel>
  );
}
