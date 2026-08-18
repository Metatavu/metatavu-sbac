/**
 * Semantic validation — the payoff of modelling instead of drawing.
 *
 * Everything here is a *warning*, never a restriction: a blueprint mid-workshop
 * is supposed to be incomplete. Severity only orders the list.
 */

/** @typedef {{severity:'error'|'warning'|'info', message:string, ref:string, elementId?:string, stageId?:string}} Warning */

const MAX_WARNINGS = 14;

/**
 * @param {import('./document.js').BlueprintDocument} doc
 * @param {{strict?: boolean}} options  strict adds ownership checks (Model mode)
 * @returns {Warning[]}
 */
export function validate(doc, { strict = false } = {}) {
  const warnings = [];
  const elementsById = new Map(doc.elements.map((element) => [element.id, element]));
  const laneKind = new Map(doc.lanes.map((lane) => [lane.id, lane.kind]));
  const systemIds = new Set(doc.systems.map((system) => system.id));

  const connected = new Set();
  doc.connections.forEach((connection) => {
    connected.add(connection.from);
    connected.add(connection.to);
  });

  doc.elements.forEach((element) => {
    const kind = laneKind.get(element.lane);

    if (kind === 'frontstage' && !connected.has(element.id)) {
      warnings.push({
        severity: 'warning',
        message: 'Frontstage action has no customer interaction',
        ref: element.id,
        elementId: element.id,
      });
    }
    if (kind === 'customer' && !connected.has(element.id)) {
      warnings.push({
        severity: 'warning',
        message: 'Customer action has no supporting activity',
        ref: element.id,
        elementId: element.id,
      });
    }
    if (element.system && !systemIds.has(element.system)) {
      warnings.push({
        severity: 'error',
        message: 'Referenced system does not exist',
        ref: element.system,
        elementId: element.id,
      });
    }
    if (strict && !element.owner && kind !== 'evidence' && kind !== 'customer') {
      warnings.push({
        severity: 'info',
        message: 'Element has no owner',
        ref: element.id,
        elementId: element.id,
      });
    }
    if (
      strict &&
      element.status === 'implemented' &&
      kind === 'technology' &&
      !element.telemetry
    ) {
      warnings.push({
        severity: 'info',
        message: 'Implemented customer interaction has no telemetry',
        ref: element.id,
        elementId: element.id,
      });
    }
  });

  doc.connections.forEach((connection) => {
    const missing = !elementsById.has(connection.from) || !elementsById.has(connection.to);
    if (missing) {
      warnings.push({
        severity: 'error',
        message: 'Connection references missing element',
        ref: `${connection.from} → ${connection.to}`,
        elementId: elementsById.has(connection.from) ? connection.to : connection.from,
      });
    }
  });

  doc.stages.forEach((stage) => {
    const hasCustomerAction = doc.elements.some(
      (element) => element.stage === stage.id && laneKind.get(element.lane) === 'customer'
    );
    if (!hasCustomerAction) {
      warnings.push({
        severity: 'warning',
        message: 'Stage contains no customer action',
        ref: stage.id,
        stageId: stage.id,
      });
    }
  });

  return warnings.slice(0, MAX_WARNINGS);
}
