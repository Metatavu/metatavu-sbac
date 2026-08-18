/**
 * useBlueprint — the editor's single source of truth.
 *
 * Splits cleanly in two:
 *   • `doc` — the semantic model, mutated only through `documentReducer` actions.
 *   • `ui`  — selection, mode, zoom, filter, in-flight interactions. Never saved.
 *
 * Components receive `doc`, `ui`, `actions` and derived values; they hold no
 * state of their own beyond transient input text.
 */

import { useCallback, useMemo, useReducer, useState } from 'react';
import { documentReducer } from '../model/reducer.js';
import { validate } from '../model/validate.js';
import { toFile } from '../model/document.js';
import { serializeJson, serializeYaml } from '../model/yaml.js';

/** @param {import('../model/document.js').BlueprintDocument} initialDoc */
export function useBlueprint(initialDoc) {
  const [doc, dispatch] = useReducer(documentReducer, initialDoc);

  const [ui, setUi] = useState({
    /** 'workshop' | 'model' */
    mode: 'workshop',
    /** {kind:'element'|'stage'|'lane'|'connection', id?:string, index?:number} | null */
    selection: null,
    /** {kind:'actor'|'system'|'marker'|'emotion', value:string} | null */
    filter: null,
    zoom: 1,
    /** element id the user is drawing a connection from */
    connectFrom: null,
    /** `${stageId}/${laneId}` of the cell with an open quick-add input */
    addingIn: null,
    /** {kind:'lane'|'stage', id:string} | null */
    renaming: null,
    /** element id currently being dragged */
    draggingId: null,
    dirty: false,
  });

  const patchUi = useCallback((patch) => setUi((prev) => ({ ...prev, ...patch })), []);

  /** Every document mutation goes through here, so `dirty` can never drift. */
  const mutate = useCallback((action) => {
    dispatch(action);
    setUi((prev) => ({ ...prev, dirty: true }));
  }, []);

  const actions = useMemo(
    () => ({
      /* document */
      load: (next) => {
        dispatch({ type: 'load', doc: next });
        setUi((prev) => ({ ...prev, dirty: false, selection: null, filter: null, connectFrom: null }));
      },
      markSaved: () => patchUi({ dirty: false }),

      /* stages */
      insertStage: (index, name) => mutate({ type: 'insertStage', index, name }),
      updateStage: (id, patch) => mutate({ type: 'updateStage', id, patch }),
      moveStage: (id, by) => mutate({ type: 'moveStage', id, by }),
      splitStage: (id) => mutate({ type: 'splitStage', id }),
      deleteStage: (id) => {
        mutate({ type: 'deleteStage', id });
        patchUi({ selection: null });
      },

      /* lanes */
      addLane: () => mutate({ type: 'addLane' }),
      updateLane: (id, patch) => mutate({ type: 'updateLane', id, patch }),
      moveLane: (id, by) => mutate({ type: 'moveLane', id, by }),
      deleteLane: (id) => {
        mutate({ type: 'deleteLane', id });
        patchUi({ selection: null });
      },

      /* visibility (presentation metadata) */
      setHidden: (kind, id, hidden) => mutate({ type: 'setHidden', kind, id, hidden }),
      showAll: () => mutate({ type: 'showAll' }),

      /* elements */
      addElement: (stage, lane, label) => mutate({ type: 'addElement', stage, lane, label }),
      updateElement: (id, patch) => mutate({ type: 'updateElement', id, patch }),
      moveElement: (id, stage, lane, beforeId) =>
        mutate({ type: 'moveElement', id, stage, lane, beforeId }),
      deleteElement: (id) => {
        mutate({ type: 'deleteElement', id });
        patchUi({ selection: null });
      },

      /* connections */
      startConnect: (id) => patchUi({ connectFrom: id, selection: { kind: 'element', id } }),
      cancelConnect: () => patchUi({ connectFrom: null }),
      completeConnect: (toId) => {
        const fromId = ui.connectFrom;
        if (!fromId || fromId === toId) return;
        mutate({ type: 'connect', from: fromId, to: toId });
        patchUi({ connectFrom: null, selection: { kind: 'element', id: fromId } });
      },
      updateConnection: (index, patch) => mutate({ type: 'updateConnection', index, patch }),
      deleteConnection: (index) => {
        mutate({ type: 'deleteConnection', index });
        patchUi({ selection: null });
      },

      /* ui */
      setMode: (mode) => patchUi({ mode }),
      select: (selection) => patchUi({ selection, connectFrom: null }),
      clearSelection: () => patchUi({ selection: null, renaming: null }),
      toggleFilter: (kind, value) =>
        setUi((prev) => ({
          ...prev,
          selection: null,
          filter:
            prev.filter && prev.filter.kind === kind && prev.filter.value === value
              ? null
              : { kind, value },
        })),
      clearFilter: () => patchUi({ filter: null }),
      setZoom: (zoom) => patchUi({ zoom: Math.min(1.6, Math.max(0.5, Math.round(zoom * 10) / 10)) }),
      startRename: (kind, id) => patchUi({ renaming: { kind, id } }),
      endRename: () => patchUi({ renaming: null }),
      openQuickAdd: (cellKey) => patchUi({ addingIn: cellKey, selection: null }),
      closeQuickAdd: () => patchUi({ addingIn: null }),
      setDragging: (draggingId) => patchUi({ draggingId }),
    }),
    [mutate, patchUi, ui.connectFrom]
  );

  /* --------------------------------------------------------------- derived */

  const file = useMemo(() => toFile(doc), [doc]);

  const derived = useMemo(() => {
    const elementsById = new Map(doc.elements.map((element) => [element.id, element]));
    const warnings = validate(doc, { strict: ui.mode === 'model' });

    /** Ids connected to the current selection — used to highlight neighbours. */
    const neighbours = new Set();
    if (ui.selection?.kind === 'element') {
      doc.connections.forEach((connection) => {
        if (connection.from === ui.selection.id) neighbours.add(connection.to);
        if (connection.to === ui.selection.id) neighbours.add(connection.from);
      });
    }

    /** Does an element pass the active highlight filter? */
    const matchesFilter = (element) => {
      if (!ui.filter) return true;
      const { kind, value } = ui.filter;
      if (kind === 'actor') return element.actor === value;
      if (kind === 'system') return element.system === value;
      if (kind === 'marker') return element.marker === value;
      if (kind === 'emotion') return element.emotion === value;
      return true;
    };

    return {
      elementsById,
      actorsById: new Map(doc.actors.map((actor) => [actor.id, actor])),
      systemsById: new Map(doc.systems.map((system) => [system.id, system])),
      lanesById: new Map(doc.lanes.map((lane) => [lane.id, lane])),
      stagesById: new Map(doc.stages.map((stage) => [stage.id, stage])),
      warnings,
      neighbours,
      matchesFilter,
      yaml: serializeYaml(file),
      json: serializeJson(file),
    };
  }, [doc, file, ui.filter, ui.mode, ui.selection]);

  return { doc, ui, actions, derived, file };
}
