/**
 * The normalized in-memory document, and its mapping to/from the file shape.
 *
 * In memory we keep flat, editor-friendly fields (`sourcePath`, `metricName`, …).
 * On disk we write the nested, human-authored shape (`refs.source.path`,
 * `metrics: [{name, value}]`, …). Keeping the two mappings in one file means the
 * wire format can evolve without touching components.
 *
 * @typedef {Object} Lane
 * @property {string} id
 * @property {string} kind         one of LANE_KINDS
 * @property {string} label
 * @property {string} [sublabel]
 * @property {string} [dividerAfter]  a blueprint line rendered below this lane
 * @property {boolean} [hidden]       presentation only; never affects semantics
 *
 * @typedef {Object} Stage
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {{min:number,max:number,unit:string}|null} [duration]
 * @property {boolean} [hidden]
 * @property {boolean} [titleHidden]
 * @property {boolean} [durationHidden]
 *
 * @typedef {Object} BlueprintElement
 * @property {string} id
 * @property {string} stage        stage id — semantic position, not an x coordinate
 * @property {string} lane         lane id  — semantic position, not a y coordinate
 * @property {string} type         one of ELEMENT_TYPES
 * @property {string} label
 * @property {string} [marker]     fact | assumption | question | pain | opportunity | idea
 * @property {string} [emotion]    positive | neutral | frustrated
 * @property {string} [actor]      actor id
 * @property {string} [system]     system id
 * @property {string} [owner]      team slug
 * @property {string} [status]     one of STATUSES
 * @property {string} [note]       workshop annotation shown on the card
 * @property {string} [image]      path or URL of an attached photo (evidence)
 * @property {string} [metricName]
 * @property {string} [metricValue]
 * @property {string} [sourcePath] refs.source.path
 * @property {string} [telemetry]  telemetry.event
 *
 * @typedef {Object} Connection
 * @property {string} from         element id
 * @property {string} to           element id
 * @property {string} type         one of CONNECTION_TYPES
 * @property {boolean} [bidirectional]  codependency — renders a double arrow
 *
 * @typedef {Object} BlueprintDocument
 * @property {{id:string,name:string}} service
 * @property {boolean} [stageHeadersHidden]
 * @property {Lane[]} lanes
 * @property {Stage[]} stages
 * @property {BlueprintElement[]} elements
 * @property {Connection[]} connections
 * @property {{id:string,name:string,type?:string}[]} actors
 * @property {{id:string,name:string}[]} systems
 */

export const FORMAT_VERSION = 1;

/** Element order within a cell is the array order; `order` is written for humans. */
const ORDER_STEP = 10;

/** Normalized document -> file shape (what `serializeYaml` writes). */
export function toFile(doc) {
  const out = {
    version: FORMAT_VERSION,
    service: doc.service,
    lanes: doc.lanes.map((lane) => {
      const out = { id: lane.id, kind: lane.kind, label: lane.label };
      if (lane.sublabel) out.sublabel = lane.sublabel;
      if (lane.dividerAfter) out.divider_after = lane.dividerAfter;
      if (lane.hidden) out.view = { hidden: true };
      return out;
    }),
    stages: doc.stages.map((stage) => {
      const out = { id: stage.id, name: stage.name };
      if (stage.description) out.description = stage.description;
      if (stage.duration) out.duration = stage.duration;
      if (stage.hidden || stage.titleHidden || stage.durationHidden) {
        out.view = {};
        if (stage.hidden) out.view.hidden = true;
        if (stage.titleHidden) out.view.title_hidden = true;
        if (stage.durationHidden) out.view.duration_hidden = true;
      }
      return out;
    }),
    actors: doc.actors,
    systems: doc.systems,
    elements: doc.elements.map((element, index) => {
      const out = {
        id: element.id,
        stage: element.stage,
        lane: element.lane,
        type: element.type,
        label: element.label,
        order: (index + 1) * ORDER_STEP,
      };
      if (element.marker) out.marker = element.marker;
      if (element.emotion) out.emotion = element.emotion;
      if (element.actor) out.actor = element.actor;
      if (element.system) out.system = element.system;
      if (element.owner) out.owner = element.owner;
      if (element.status) out.status = element.status;
      if (element.note) out.note = element.note;
      if (element.image) out.image = element.image;
      if (element.metricName || element.metricValue) {
        out.metrics = [{ name: element.metricName || 'metric', value: element.metricValue || '' }];
      }
      if (element.sourcePath) out.refs = { source: { path: element.sourcePath } };
      if (element.telemetry) out.telemetry = { event: element.telemetry };
      return out;
    }),
    connections: doc.connections.map((connection) => {
      const out = { from: connection.from, to: connection.to, type: connection.type };
      if (connection.bidirectional) out.bidirectional = true;
      return out;
    }),
  };
  if (doc.stageHeadersHidden) out.view = { stage_headers_hidden: true };
  return out;
}

/** File shape -> normalized document. Tolerates the older `items:` key. */
export function fromFile(file) {
  return {
    service: file.service || { id: 'blueprint', name: 'Blueprint' },
    stageHeadersHidden: Boolean(file.view && file.view.stage_headers_hidden),
    lanes: (file.lanes || []).map((lane) => ({
      id: lane.id,
      kind: lane.kind || 'custom',
      label: lane.label || lane.id,
      sublabel: lane.sublabel || '',
      dividerAfter: lane.divider_after || '',
      hidden: Boolean(lane.view && lane.view.hidden),
    })),
    stages: (file.stages || []).map((stage) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      duration: stage.duration || null,
      hidden: Boolean(stage.view && stage.view.hidden),
      titleHidden: Boolean(stage.view && stage.view.title_hidden),
      durationHidden: Boolean(stage.view && stage.view.duration_hidden),
    })),
    elements: (file.elements || file.items || []).map((element) => ({
      id: element.id,
      stage: element.stage,
      lane: element.lane,
      type: element.type || 'customer-action',
      label: element.label,
      marker: element.marker || '',
      emotion: element.emotion || '',
      actor: element.actor || '',
      system: element.system || '',
      owner: element.owner || '',
      status: element.status || '',
      note: element.note || '',
      image: element.image || '',
      metricName: element.metrics?.[0]?.name || '',
      metricValue: element.metrics?.[0] ? String(element.metrics[0].value) : '',
      sourcePath: element.refs?.source?.path || '',
      telemetry: element.telemetry?.event || '',
    })),
    connections: file.connections || [],
    actors: file.actors || [],
    systems: file.systems || [],
  };
}

/**
 * Parse + validate a file object into a document, throwing readable errors.
 * `rawText` (optional) enables completeness checks against the source.
 */
export function documentFromFile(file, rawText, countEntries) {
  if (!file || !file.lanes || !file.stages) {
    throw new Error('missing lanes or stages');
  }
  const doc = fromFile(file);

  if (rawText && countEntries) {
    const check = (key, parsed) => {
      const found = countEntries(rawText, key);
      if (found && found !== parsed) {
        throw new Error(`${key} — parsed ${parsed} of ${found} entries in the source`);
      }
    };
    check('lanes', doc.lanes.length);
    check('stages', doc.stages.length);
    check('elements', doc.elements.length);
    check('connections', doc.connections.length);
  }

  const laneIds = new Set(doc.lanes.map((lane) => lane.id));
  const stageIds = new Set(doc.stages.map((stage) => stage.id));
  const orphans = doc.elements.filter(
    (element) => !laneIds.has(element.lane) || !stageIds.has(element.stage)
  );
  if (orphans.length) {
    throw new Error(
      `${orphans.length} element(s) reference an unknown stage or lane — first: ${orphans[0].id}`
    );
  }
  return doc;
}

/** Elements of one cell, in document order. */
export const elementsInCell = (doc, stageId, laneId) =>
  doc.elements.filter((element) => element.stage === stageId && element.lane === laneId);

export const visibleLanes = (doc) => doc.lanes.filter((lane) => !lane.hidden);
export const visibleStages = (doc) => doc.stages.filter((stage) => !stage.hidden);

export const byId = (list) => new Map(list.map((entry) => [entry.id, entry]));
