/**
 * Deterministic SVG renderer — the export pipeline's last stage:
 *
 *   YAML -> parse -> validate -> document -> layout -> SVG -> (PNG | PDF)
 *
 * Pure: same document + options in, byte-identical SVG out. It never reads the
 * live DOM, so it can also run headless (CLI, CI, server-side thumbnails).
 * Layout is derived entirely from semantic position (stage, lane, order) — there
 * are no stored coordinates to drift.
 */

import { isStrongLine, MARKERS } from './constants.js';
import { elementsInCell, visibleLanes, visibleStages } from './document.js';
import { connectionColor, laneTint } from '../theme.js';

const LAYOUT = {
  pad: 24,
  labelWidth: 172,
  cellWidth: 240,
  headerHeight: 56,
  gap: 8,
  cardHeight: 46,
  cardHeightWithImage: 104,
  rowPadding: 12,
  dividerHeight: 22,
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escape = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ESCAPES[char]);

/** Greedy wrap; the renderer has no text metrics, so it wraps on character budget. */
function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  String(text || '')
    .split(/\s+/)
    .flatMap((word) => word.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [])
    .forEach((word) => {
      if (`${line} ${word}`.trim().length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    });
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {import('./document.js').BlueprintDocument} doc
 * @param {Object} [options]
 * @param {boolean} [options.images=true]       draw evidence photos
 * @param {boolean} [options.connections=true]  draw arrows
 * @param {boolean} [options.metadata=false]    draw status metadata
 * @param {Record<string,string>} [options.imageSources]  elementId -> data URL / path override
 * @returns {{svg:string, width:number, height:number}}
 */
export function renderSvg(doc, options = {}) {
  const {
    images = true,
    connections = true,
    metadata = false,
    imageSources = {},
  } = options;

  const lanes = visibleLanes(doc);
  const stages = visibleStages(doc);
  const headerHeight = doc.stageHeadersHidden ? 28 : LAYOUT.headerHeight;
  const imageFor = (element) => imageSources[element.id] || element.image || '';
  const heightOf = (element, lane) =>
    lane.kind === 'evidence' && images && imageFor(element)
      ? LAYOUT.cardHeightWithImage
      : Math.max(LAYOUT.cardHeight, 20 + Math.min(wrap(element.label, 26).length, 3) * 13);

  const laneHeights = lanes.map((lane) => {
    let tallest = LAYOUT.cardHeight;
    stages.forEach((stage) => {
      const stack = elementsInCell(doc, stage.id, lane.id).reduce(
        (total, element) => total + heightOf(element, lane) + LAYOUT.gap,
        -LAYOUT.gap
      );
      tallest = Math.max(tallest, stack);
    });
    return tallest + LAYOUT.rowPadding * 2;
  });

  const laneTops = [];
  let cursorY = LAYOUT.pad + headerHeight;
  lanes.forEach((lane, index) => {
    laneTops.push(cursorY);
    cursorY += laneHeights[index] + (lane.dividerAfter ? LAYOUT.dividerHeight : 0);
  });

  const width = LAYOUT.pad * 2 + LAYOUT.labelWidth + stages.length * LAYOUT.cellWidth;
  const height = cursorY + LAYOUT.pad;

  const boxes = new Map();
  const parts = [`<rect width="${width}" height="${height}" fill="#FFFFFF"/>`];

  const text = (x, y, value, attrs = '') =>
    `<text x="${x}" y="${y}" font-family="IBM Plex Sans, sans-serif" ${attrs}>${escape(value)}</text>`;

  parts.push(
    text(LAYOUT.pad, LAYOUT.pad + 18, doc.service.name, 'font-size="17" font-weight="600" fill="#16202A"')
  );

  if (!doc.stageHeadersHidden) {
    stages.forEach((stage, column) => {
      const x = LAYOUT.pad + LAYOUT.labelWidth + column * LAYOUT.cellWidth;
      parts.push(
        `<line x1="${x}" y1="${LAYOUT.pad + headerHeight - 10}" x2="${x}" y2="${height - LAYOUT.pad}" stroke="#E4E8E4" stroke-width="1"/>`
      );
      if (!stage.titleHidden) {
        parts.push(
          text(x + 12, LAYOUT.pad + headerHeight - 22, stage.name || 'Untitled stage', 'font-size="13" font-weight="600" fill="#16202A"')
        );
      }
      if (stage.duration && !stage.durationHidden) {
        const { min, max, unit } = stage.duration;
        const label = min === max ? `${min} ${unit}` : `${min}-${max} ${unit}`;
        parts.push(
          `<text x="${x + 12}" y="${LAYOUT.pad + headerHeight - 8}" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#8B958D">${escape(label)}</text>`
        );
      }
    });
  }

  lanes.forEach((lane, row) => {
    const tint = laneTint[lane.kind] || laneTint.custom;
    const top = laneTops[row];
    const isEvidence = lane.kind === 'evidence';

    if (row % 2 === 1) {
      parts.push(
        `<rect x="${LAYOUT.pad + LAYOUT.labelWidth}" y="${top}" width="${stages.length * LAYOUT.cellWidth}" height="${laneHeights[row]}" fill="#FAFBFA"/>`
      );
    }
    parts.push(
      text(
        LAYOUT.pad + LAYOUT.labelWidth - 12,
        top + laneHeights[row] / 2,
        lane.label.toUpperCase(),
        'text-anchor="end" font-size="10.5" font-weight="600" letter-spacing="0.6" fill="#3A4A56"'
      )
    );
    if (lane.sublabel) {
      parts.push(
        text(
          LAYOUT.pad + LAYOUT.labelWidth - 12,
          top + laneHeights[row] / 2 + 13,
          lane.sublabel,
          'text-anchor="end" font-size="9.5" font-style="italic" fill="#9AA49C"'
        )
      );
    }

    stages.forEach((stage, column) => {
      const x = LAYOUT.pad + LAYOUT.labelWidth + column * LAYOUT.cellWidth;
      let y = top + LAYOUT.rowPadding;

      elementsInCell(doc, stage.id, lane.id).forEach((element) => {
        const cardHeight = heightOf(element, lane);
        const cardX = x + 10;
        const cardWidth = LAYOUT.cellWidth - 20;
        const source = isEvidence && images ? imageFor(element) : '';

        boxes.set(element.id, { x: cardX, y, width: cardWidth, height: cardHeight });

        parts.push(
          `<rect x="${cardX}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${isEvidence ? 4 : 6}" fill="${tint.fill}" stroke="${tint.border}"${isEvidence ? ' stroke-dasharray="3 2"' : ''}/>`
        );

        let textY = y + 16;
        if (source) {
          const imageHeight = cardHeight - 28;
          const clipId = `clip-${escape(element.id)}`;
          parts.push(
            `<clipPath id="${clipId}"><rect x="${cardX + 5}" y="${y + 5}" width="${cardWidth - 10}" height="${imageHeight}" rx="3"/></clipPath>`,
            `<image x="${cardX + 5}" y="${y + 5}" width="${cardWidth - 10}" height="${imageHeight}" href="${escape(source)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
          );
          textY = y + cardHeight - 8;
        }

        wrap(element.label, isEvidence ? 30 : 26)
          .slice(0, source ? 1 : 3)
          .forEach((line, index) => {
            parts.push(
              text(cardX + 9, textY + index * 13, line, `font-size="${isEvidence ? 9.5 : 11}" fill="${tint.ink}"`)
            );
          });

        if (metadata && element.status && !source) {
          parts.push(
            `<text x="${cardX + cardWidth - 9}" y="${y + cardHeight - 7}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="8" fill="rgba(22,32,42,0.5)">${escape(element.status)}</text>`
          );
        }
        const marker = MARKERS[element.marker];
        if (marker) {
          parts.push(
            `<circle cx="${cardX + cardWidth - 9}" cy="${y + 10}" r="3.5" fill="${marker.color}"/>`
          );
        }
        y += cardHeight + LAYOUT.gap;
      });
    });

    if (lane.dividerAfter) {
      const dividerY = top + laneHeights[row] + LAYOUT.dividerHeight / 2;
      const strong = isStrongLine(lane.dividerAfter);
      parts.push(
        `<line x1="${LAYOUT.pad + LAYOUT.labelWidth}" y1="${dividerY}" x2="${width - LAYOUT.pad}" y2="${dividerY}" stroke="${strong ? '#16202A' : '#7B8794'}" stroke-width="1.6"${strong ? '' : ' stroke-dasharray="6 4"'}/>`,
        text(
          LAYOUT.pad + LAYOUT.labelWidth - 12,
          dividerY + 3,
          lane.dividerAfter.toUpperCase(),
          'text-anchor="end" font-size="8.5" font-weight="600" letter-spacing="0.5" fill="#6B7780"'
        )
      );
    }
  });

  const connectionParts = [];
  if (connections) {
    doc.connections.forEach((connection) => {
      const from = boxes.get(connection.from);
      const to = boxes.get(connection.to);
      if (!from || !to) return;
      const stroke = connectionColor[connection.type] || '#8B958D';
      const markerId = `arrow-${stroke.slice(1)}`;
      connectionParts.push(
        `<path d="${routeOrthogonal(from, to)}" fill="none" stroke="${stroke}" stroke-width="1.3" marker-end="url(#${markerId})"${connection.bidirectional ? ` marker-start="url(#${markerId})"` : ''}/>`
      );
    });
  }

  const strokes = [...new Set(Object.values(connectionColor))];
  const defs = `<defs>${strokes
    .map(
      (stroke) =>
        `<marker id="arrow-${stroke.slice(1)}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="${stroke}"/></marker>`
    )
    .join('')}</defs>`;
  const [background, ...content] = parts;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${background}${connectionParts.join('')}${content.join('')}</svg>`,
    width,
    height,
  };
}

/**
 * Route a connector between two boxes: vertical when stacked, horizontal when
 * level, otherwise a three-segment orthogonal path through the midpoint.
 * Users never edit this — geometry is a function of the model.
 */
export function routeOrthogonal(from, to) {
  const fromCenterX = from.x + from.width / 2;
  const toCenterX = to.x + to.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterY = to.y + to.height / 2;

  if (Math.abs(fromCenterX - toCenterX) < 40) {
    return to.y > from.y
      ? `M${fromCenterX},${from.y + from.height} L${toCenterX},${to.y}`
      : `M${fromCenterX},${from.y} L${toCenterX},${to.y + to.height}`;
  }
  if (Math.abs(fromCenterY - toCenterY) < 30) {
    return to.x > from.x
      ? `M${from.x + from.width},${fromCenterY} L${to.x},${toCenterY}`
      : `M${from.x},${fromCenterY} L${to.x + to.width},${toCenterY}`;
  }
  const exitX = to.x > from.x ? from.x + from.width : from.x;
  const entryX = to.x > from.x ? to.x : to.x + to.width;
  const midX = (exitX + entryX) / 2;
  return `M${exitX},${fromCenterY} L${midX},${fromCenterY} L${midX},${toCenterY} L${entryX},${toCenterY}`;
}
