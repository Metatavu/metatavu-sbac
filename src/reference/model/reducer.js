/**
 * Document reducer — every semantic mutation in one place.
 *
 * Each action names a *service-blueprint* operation ("move element to another
 * lane", "split stage"), never a graphical one ("set x/y", "resize"). That is
 * what makes the model machine-readable, AI-editable and diff-friendly: the
 * reducer is also the complete list of things an agent or a script may do.
 *
 * Pure and synchronous — trivially unit-testable, and ready for undo/redo by
 * keeping a stack of documents.
 */

import { DEFAULT_ELEMENT_TYPE } from './constants.js';
import { uniqueId } from './ids.js';

/** Infer a connection type from the lanes the two elements sit in. */
export function inferConnectionType(doc, from, to) {
  const kindOf = new Map(doc.lanes.map((lane) => [lane.id, lane.kind]));
  const a = kindOf.get(from.lane);
  const b = kindOf.get(to.lane);
  const pairIs = (x, y) => (a === x && b === y) || (a === y && b === x);

  if (pairIs('customer', 'frontstage') || pairIs('customer', 'technology')) return 'interaction';
  if (pairIs('frontstage', 'backstage') || pairIs('technology', 'backstage')) return 'dependency';
  if (a === b) return 'triggers';
  if (from.system || to.system) return 'system-call';
  return 'dependency';
}

const replaceById = (list, id, patch) =>
  list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));

const swap = (list, index, target) => {
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export function documentReducer(doc, action) {
  switch (action.type) {
    /* ---------------------------------------------------------------- document */

    case 'load':
      return action.doc;

    case 'renameService':
      return { ...doc, service: { ...doc.service, name: action.name } };

    case 'setStageHeadersHidden':
      return { ...doc, stageHeadersHidden: action.hidden };

    /* ------------------------------------------------------------------ stages */

    case 'insertStage': {
      const id = uniqueId(action.name || 'stage', doc.stages.map((stage) => stage.id));
      const stages = doc.stages.slice();
      stages.splice(action.index ?? stages.length, 0, {
        id,
        name: action.name || 'New stage',
        description: '',
        duration: null,
      });
      return { ...doc, stages };
    }

    case 'updateStage':
      return { ...doc, stages: replaceById(doc.stages, action.id, action.patch) };

    case 'moveStage': {
      const index = doc.stages.findIndex((stage) => stage.id === action.id);
      return { ...doc, stages: swap(doc.stages, index, index + action.by) };
    }

    /** Split keeps the original stage and adds a sibling after it; elements stay put. */
    case 'splitStage': {
      const source = doc.stages.find((stage) => stage.id === action.id);
      if (!source) return doc;
      const id = uniqueId(`${source.name} b`, doc.stages.map((stage) => stage.id));
      const stages = doc.stages.slice();
      stages.splice(stages.indexOf(source) + 1, 0, {
        id,
        name: `${source.name} (part 2)`,
        description: '',
        duration: source.duration,
      });
      return { ...doc, stages };
    }

    case 'deleteStage':
      return {
        ...doc,
        stages: doc.stages.filter((stage) => stage.id !== action.id),
        elements: doc.elements.filter((element) => element.stage !== action.id),
        connections: keepResolvable(
          doc.connections,
          doc.elements.filter((element) => element.stage !== action.id)
        ),
      };

    /* ------------------------------------------------------------------- lanes */

    case 'addLane': {
      const id = uniqueId(action.label || 'lane', doc.lanes.map((lane) => lane.id));
      return {
        ...doc,
        lanes: [
          ...doc.lanes,
          { id, kind: action.kind || 'custom', label: action.label || 'New lane', sublabel: '' },
        ],
      };
    }

    case 'updateLane':
      return { ...doc, lanes: replaceById(doc.lanes, action.id, action.patch) };

    case 'moveLane': {
      const index = doc.lanes.findIndex((lane) => lane.id === action.id);
      return { ...doc, lanes: swap(doc.lanes, index, index + action.by) };
    }

    case 'deleteLane': {
      const elements = doc.elements.filter((element) => element.lane !== action.id);
      return {
        ...doc,
        lanes: doc.lanes.filter((lane) => lane.id !== action.id),
        elements,
        connections: keepResolvable(doc.connections, elements),
      };
    }

    /** Hiding is presentation metadata — it never removes anything from the model. */
    case 'setHidden': {
      const key = action.kind === 'lane' ? 'lanes' : 'stages';
      return { ...doc, [key]: replaceById(doc[key], action.id, { hidden: action.hidden }) };
    }

    case 'showAll':
      return {
        ...doc,
        lanes: doc.lanes.map((lane) => ({ ...lane, hidden: false })),
        stages: doc.stages.map((stage) => ({ ...stage, hidden: false })),
      };

    /* ---------------------------------------------------------------- elements */

    case 'addElement': {
      const lane = doc.lanes.find((entry) => entry.id === action.lane);
      const id = uniqueId(action.label, doc.elements.map((element) => element.id));
      return {
        ...doc,
        elements: [
          ...doc.elements,
          {
            id,
            stage: action.stage,
            lane: action.lane,
            type: DEFAULT_ELEMENT_TYPE[lane?.kind] || 'backstage-action',
            label: action.label,
          },
        ],
      };
    }

    case 'updateElement':
      return { ...doc, elements: replaceById(doc.elements, action.id, action.patch) };

    /**
     * Reassign an element's stage/lane and its order within the cell.
     * `beforeId` is the element it was dropped onto; omit to append.
     */
    case 'moveElement': {
      const element = doc.elements.find((entry) => entry.id === action.id);
      if (!element) return doc;
      const rest = doc.elements.filter((entry) => entry.id !== action.id);
      const moved = { ...element, stage: action.stage, lane: action.lane };

      if (action.beforeId && action.beforeId !== action.id) {
        const index = rest.findIndex((entry) => entry.id === action.beforeId);
        if (index >= 0) {
          rest.splice(index, 0, moved);
          return { ...doc, elements: rest };
        }
      }
      let lastInCell = -1;
      rest.forEach((entry, index) => {
        if (entry.stage === action.stage && entry.lane === action.lane) lastInCell = index;
      });
      rest.splice(lastInCell + 1, 0, moved);
      return { ...doc, elements: rest };
    }

    case 'deleteElement':
      return {
        ...doc,
        elements: doc.elements.filter((element) => element.id !== action.id),
        connections: doc.connections.filter(
          (connection) => connection.from !== action.id && connection.to !== action.id
        ),
      };

    /* ------------------------------------------------------------- connections */

    case 'connect': {
      const from = doc.elements.find((element) => element.id === action.from);
      const to = doc.elements.find((element) => element.id === action.to);
      if (!from || !to) return doc;
      const exists = doc.connections.some(
        (connection) =>
          (connection.from === action.from && connection.to === action.to) ||
          (connection.from === action.to && connection.to === action.from)
      );
      if (exists) return doc;
      return {
        ...doc,
        connections: [
          ...doc.connections,
          { from: action.from, to: action.to, type: action.connectionType || inferConnectionType(doc, from, to) },
        ],
      };
    }

    case 'updateConnection':
      return {
        ...doc,
        connections: doc.connections.map((connection, index) =>
          index === action.index ? { ...connection, ...action.patch } : connection
        ),
      };

    case 'deleteConnection':
      return {
        ...doc,
        connections: doc.connections.filter((_, index) => index !== action.index),
      };

    default:
      return doc;
  }
}

/** Drop connections whose endpoints no longer exist. */
function keepResolvable(connections, elements) {
  const ids = new Set(elements.map((element) => element.id));
  return connections.filter((connection) => ids.has(connection.from) && ids.has(connection.to));
}
