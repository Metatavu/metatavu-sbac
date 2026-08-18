/**
 * Canvas — the blueprint grid: stage headers, lane rows, cells, cards, the three
 * blueprint lines, and the connection overlay.
 *
 * The grid is a plain flex layout driven by the model. Connector geometry is the
 * one thing that needs real measurements, so an effect measures the rendered
 * cards and routes the arrows with the same pure `routeOrthogonal` used by the
 * SVG exporter — the screen and the export agree by construction.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isStrongLine } from '../model/constants.js';
import { elementsInCell, visibleLanes, visibleStages } from '../model/document.js';
import { routeOrthogonal } from '../model/renderSvg.js';
import { color, connectionColor, radius, size, strokeFor } from '../theme.js';
import { ElementCard } from './ElementCard.jsx';
import { StageHeader } from './StageHeader.jsx';

export function Canvas({ doc, ui, actions, derived, renderImageSlot }) {
  const lanes = visibleLanes(doc);
  const stages = visibleStages(doc);

  const gridRef = useRef(null);
  const cardRefs = useRef(new Map());
  const dropTargetRef = useRef(null);
  const [paths, setPaths] = useState([]);
  const [dropCell, setDropCell] = useState(null);

  const registerCard = useCallback((id) => (element) => {
    if (element) cardRefs.current.set(id, element);
    else cardRefs.current.delete(id);
  }, []);

  /** Measure card boxes in unscaled grid space, then route every connection. */
  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const origin = grid.getBoundingClientRect();
    const zoom = ui.zoom || 1;

    const boxOf = (id) => {
      const element = cardRefs.current.get(id);
      if (!element || !element.isConnected) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: (rect.left - origin.left) / zoom,
        y: (rect.top - origin.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
      };
    };

    const next = [];
    doc.connections.forEach((connection, index) => {
      const from = boxOf(connection.from);
      const to = boxOf(connection.to);
      if (!from || !to) return;

      const selectedConnection = ui.selection?.kind === 'connection' && ui.selection.index === index;
      const touchesSelection =
        selectedConnection ||
        (ui.selection?.kind === 'element' &&
          (ui.selection.id === connection.from || ui.selection.id === connection.to));

      next.push({
        index,
        d: routeOrthogonal(from, to),
        stroke: strokeFor(connection.type),
        width: selectedConnection ? 3 : touchesSelection ? 2.2 : 1.4,
        opacity: ui.filter && !touchesSelection ? 0.15 : touchesSelection ? 1 : 0.7,
        bidirectional: Boolean(connection.bidirectional),
      });
    });
    setPaths(next);
  }, [doc.connections, ui.filter, ui.selection, ui.zoom]);

  useLayoutEffect(measure, [measure, doc.elements, doc.lanes, doc.stages, ui.mode]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        onClick={actions.clearSelection}
        style={{
          flex: 1,
          overflow: 'auto',
          background: color.canvas,
          padding: '22px 28px 60px',
        }}
      >
        <div
          ref={gridRef}
          style={{
            position: 'relative',
            display: 'inline-flex',
            flexDirection: 'column',
            minWidth: '100%',
            transform: `scale(${ui.zoom})`,
            transformOrigin: 'top left',
            background: color.panel,
            border: `1px solid ${color.border}`,
            borderRadius: 12,
            padding: '4px 0 10px',
            boxShadow: '0 1px 3px rgba(22,32,42,0.06)',
          }}
        >
          {/* stage headers */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: size.laneLabel, flex: 'none' }} />
            {stages.map((stage, column) => (
              <StageHeader
                key={stage.id}
                stage={stage}
                index={doc.stages.indexOf(stage)}
                selected={ui.selection?.kind === 'stage' && ui.selection.id === stage.id}
                renaming={ui.renaming?.kind === 'stage' && ui.renaming.id === stage.id}
                actions={actions}
                canMoveLeft={column > 0}
                canMoveRight={column < stages.length - 1}
              />
            ))}
            <div style={{ width: size.stageGutter, flex: 'none', padding: '8px 0 0 8px' }}>
              <button
                type="button"
                onClick={() => actions.insertStage(doc.stages.length)}
                style={{
                  width: 76,
                  height: 30,
                  border: '1px dashed #C9D0CA',
                  borderRadius: radius.lg,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: color.muted,
                  fontSize: 11,
                }}
              >
                + Stage
              </button>
            </div>
          </div>

          {/* lane rows, each optionally followed by a blueprint line */}
          {lanes.map((lane) => (
            <React.Fragment key={lane.id}>
              <LaneRow
                lane={lane}
                stages={stages}
                doc={doc}
                ui={ui}
                actions={actions}
                derived={derived}
                dropCell={dropCell}
                setDropCell={setDropCell}
                dropTargetRef={dropTargetRef}
                registerCard={registerCard}
                renderImageSlot={renderImageSlot}
              />
              {lane.dividerAfter && <BlueprintLine label={lane.dividerAfter} />}
            </React.Fragment>
          ))}

          {/* connections */}
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <defs>
              {[...new Set(Object.values(connectionColor))].map((stroke) => (
                <marker
                  key={stroke}
                  id={`screen-arrow-${stroke.slice(1)}`}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill={stroke} />
                </marker>
              ))}
            </defs>

            {paths.map((path) => {
              const marker = `url(#screen-arrow-${path.stroke.slice(1)})`;
              return (
                <g key={path.index}>
                  <path
                    d={path.d}
                    fill="none"
                    stroke={path.stroke}
                    strokeWidth={path.width}
                    strokeLinejoin="round"
                    opacity={path.opacity}
                    markerEnd={marker}
                    markerStart={path.bidirectional ? marker : undefined}
                  />
                  {/* fat transparent hit area, so thin arrows stay clickable */}
                  <path
                    d={path.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={(event) => {
                      event.stopPropagation();
                      actions.select({ kind: 'connection', index: path.index });
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <StatusBar doc={doc} ui={ui} lanes={lanes} stages={stages} />
    </main>
  );
}

function LaneRow({
  lane,
  stages,
  doc,
  ui,
  actions,
  derived,
  dropCell,
  setDropCell,
  dropTargetRef,
  registerCard,
  renderImageSlot,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: lane.kind === 'evidence' ? 'transparent' : 'rgba(255,255,255,0.55)',
      }}
    >
      <div
        onClick={(event) => {
          event.stopPropagation();
          actions.startRename('lane', lane.id);
        }}
        style={{
          width: size.laneLabel,
          flex: 'none',
          padding: '10px 12px 10px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRight: `1px solid ${color.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#3A4A56',
            lineHeight: 1.25,
            textAlign: 'right',
          }}
        >
          {lane.label}
        </div>
        {lane.sublabel && (
          <div
            style={{
              fontSize: 10,
              color: color.faint,
              fontStyle: 'italic',
              textAlign: 'right',
              marginTop: 2,
            }}
          >
            {lane.sublabel}
          </div>
        )}
      </div>

      {stages.map((stage) => {
        const cellKey = `${stage.id}/${lane.id}`;
        const cards = elementsInCell(doc, stage.id, lane.id);
        const isDropTarget = dropCell === cellKey;

        return (
          <div
            key={cellKey}
            onDragOver={(event) => {
              event.preventDefault();
              dropTargetRef.current = null;
              setDropCell(cellKey);
            }}
            onDragLeave={() => setDropCell((current) => (current === cellKey ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (ui.draggingId) {
                actions.moveElement(ui.draggingId, stage.id, lane.id, dropTargetRef.current);
              }
              dropTargetRef.current = null;
              setDropCell(null);
            }}
            style={{
              width: size.cell,
              flex: 'none',
              minHeight: lane.kind === 'evidence' ? 44 : 78,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              borderRight: `1px solid ${color.borderHair}`,
              background: isDropTarget ? `${color.accent}14` : 'transparent',
              boxShadow: isDropTarget ? `inset 0 0 0 1.5px ${color.accent}` : 'none',
            }}
          >
            {cards.map((element) => (
              <ElementCard
                key={element.id}
                element={element}
                lane={lane}
                system={derived.systemsById.get(element.system)}
                cardRef={registerCard(element.id)}
                selected={ui.selection?.kind === 'element' && ui.selection.id === element.id}
                neighbour={derived.neighbours.has(element.id)}
                dimmed={!derived.matchesFilter(element)}
                dragging={ui.draggingId === element.id}
                connecting={Boolean(ui.connectFrom)}
                isConnectSource={ui.connectFrom === element.id}
                showMetadata={ui.mode === 'model'}
                imageSlot={renderImageSlot?.(element, lane)}
                onSelect={() => {
                  if (ui.connectFrom && ui.connectFrom !== element.id) {
                    actions.completeConnect(element.id);
                  } else {
                    actions.select({ kind: 'element', id: element.id });
                  }
                }}
                onStartConnect={() => actions.startConnect(element.id)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', element.id);
                  actions.setDragging(element.id);
                }}
                onDragEnd={() => {
                  actions.setDragging(null);
                  setDropCell(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dropTargetRef.current = element.id;
                  setDropCell(cellKey);
                }}
              />
            ))}

            {ui.addingIn === cellKey ? (
              <QuickAdd
                onCommit={(label) => actions.addElement(stage.id, lane.id, label)}
                onClose={actions.closeQuickAdd}
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.openQuickAdd(cellKey);
                }}
                style={{
                  alignSelf: 'flex-start',
                  width: 22,
                  height: 22,
                  border: '1px dashed #C9D0CA',
                  borderRadius: radius.md,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: color.faint,
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                  opacity: cards.length ? 0.35 : 0.75,
                }}
              >
                +
              </button>
            )}
          </div>
        );
      })}

      <div style={{ width: size.stageGutter, flex: 'none' }} />
    </div>
  );
}

/** Workshop-speed capture: type, Enter, type again. Escape closes. */
function QuickAdd({ onCommit, onClose }) {
  const [text, setText] = useState('');
  return (
    <input
      autoFocus
      value={text}
      placeholder="Label, then Enter"
      onChange={(event) => setText(event.target.value)}
      onBlur={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          const value = text.trim();
          if (value) onCommit(value);
          setText('');
        }
        if (event.key === 'Escape') onClose();
      }}
      style={{
        width: '100%',
        height: 34,
        border: `1.5px solid ${color.accent}`,
        borderRadius: radius.lg,
        padding: '0 9px',
        fontSize: 12,
        outline: 'none',
        background: color.panel,
      }}
    />
  );
}

function BlueprintLine({ label }) {
  const strong = isStrongLine(label);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 26, position: 'relative', zIndex: 20 }}>
      <div
        style={{
          width: size.laneLabel,
          flex: 'none',
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: color.muted,
            textAlign: 'right',
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          height: 0,
          borderTop: strong ? `2px solid ${color.ink}` : '2px dashed #7B8794',
        }}
      />
    </div>
  );
}

function StatusBar({ doc, ui, lanes, stages }) {
  const cell = {
    flex: '0 1 auto',
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  return (
    <footer
      style={{
        height: size.statusBar,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 14px',
        background: color.panel,
        borderTop: `1px solid ${color.border}`,
        fontFamily: 'inherit',
        fontSize: 10,
        color: color.label,
        overflow: 'hidden',
      }}
    >
      <div style={cell}>{doc.elements.length} elements</div>
      <div style={cell}>{doc.connections.length} connections</div>
      <div style={cell}>
        {stages.length}/{doc.stages.length} stages × {lanes.length}/{doc.lanes.length} lanes
      </div>
      <div style={{ flex: 1, minWidth: 8 }} />
      <div style={cell}>{ui.mode === 'model' ? 'model mode' : 'workshop mode'}</div>
      <div style={cell}>
        {ui.connectFrom
          ? 'connecting — pick a target element'
          : ui.mode === 'model'
            ? 'metadata visible · validation strict'
            : 'click + to add · drag cards · ⤳ to connect'}
      </div>
    </footer>
  );
}
