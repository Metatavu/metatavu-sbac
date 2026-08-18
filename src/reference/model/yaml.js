/**
 * YAML <-> document serialization.
 *
 * The YAML file is canonical; this module is the only place that knows the wire
 * format. Both directions are pure and deterministic, so a round-trip through
 * `parseYaml(serializeYaml(doc))` returns an equivalent document and repeated
 * saves produce byte-identical files (good Git diffs).
 *
 * The parser here is deliberately minimal — it reads the subset this format
 * uses (nested maps, lists of maps, scalars). In production, swap it for `yaml`
 * (eemeli/yaml) and keep this module's signatures: nothing else in the app
 * touches YAML.
 */

const NEEDS_QUOTES = /^[\w][\w \-./_@]*$/;

function formatScalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = String(value);
  if (text === '') return '""';
  if (NEEDS_QUOTES.test(text) && !/^\d+$/.test(text)) return text;
  return JSON.stringify(text);
}

function emit(value, depth) {
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        entry && typeof entry === 'object'
          ? `${pad}- ${emit(entry, depth + 1).replace(/^\s+/, '')}`
          : `${pad}- ${formatScalar(entry)}`
      )
      .join('\n');
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .map((key) => {
        const child = value[key];
        const empty =
          child === undefined ||
          child === null ||
          child === '' ||
          (Array.isArray(child) && child.length === 0);
        if (empty) return null;
        if (typeof child === 'object') return `${pad}${key}:\n${emit(child, depth + 1)}`;
        return `${pad}${key}: ${formatScalar(child)}`;
      })
      .filter(Boolean)
      .join('\n');
  }
  return `${pad}${formatScalar(value)}`;
}

/** Serialize a *file-shaped* object (see toFile in document.js) to YAML text. */
export function serializeYaml(file) {
  return `${emit(file, 0)}\n`;
}

/** Serialize the same object to JSON — an equivalent representation of one model. */
export function serializeJson(file) {
  return JSON.stringify(file, null, 2);
}

const KEY = /^([\w.$-]+):\s*(.*)$/;

function parseScalarValue(raw) {
  const text = raw.trim();
  if (text === '') return '';
  const quoted =
    (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
  if (quoted) {
    try {
      return JSON.parse(text.replace(/'/g, '"'));
    } catch {
      return text.slice(1, -1);
    }
  }
  if (/^-?\d+$/.test(text)) return parseInt(text, 10);
  if (text === 'true') return true;
  if (text === 'false') return false;
  return text;
}

/** Parse YAML text into a plain file-shaped object. Throws on malformed input. */
export function parseYaml(text) {
  const lines = String(text)
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
    .map((line) => ({ indent: line.match(/^ */)[0].length, text: line.trim() }));

  let cursor = 0;

  const node = (indent) => {
    if (cursor >= lines.length || lines[cursor].indent < indent) return null;
    return lines[cursor].text.startsWith('-') ? list(indent) : map(indent);
  };

  const valueAfterKey = (parentIndent) => {
    if (cursor < lines.length && lines[cursor].indent > parentIndent) {
      return node(lines[cursor].indent);
    }
    if (
      cursor < lines.length &&
      lines[cursor].indent === parentIndent &&
      lines[cursor].text.startsWith('-')
    ) {
      return node(parentIndent);
    }
    return null;
  };

  function map(indent) {
    const out = {};
    while (
      cursor < lines.length &&
      lines[cursor].indent === indent &&
      !lines[cursor].text.startsWith('-')
    ) {
      const match = lines[cursor].text.match(KEY);
      cursor += 1;
      if (!match) continue;
      out[match[1]] = match[2] === '' ? valueAfterKey(indent) : parseScalarValue(match[2]);
    }
    return out;
  }

  function list(indent) {
    const out = [];
    const childIndent = indent + 2;
    while (
      cursor < lines.length &&
      lines[cursor].indent === indent &&
      lines[cursor].text.startsWith('-')
    ) {
      const rest = lines[cursor].text.slice(1).trim();
      if (rest === '') {
        cursor += 1;
        out.push(node(cursor < lines.length ? lines[cursor].indent : childIndent));
        continue;
      }
      const match = rest.match(KEY);
      cursor += 1;
      if (!match) {
        out.push(parseScalarValue(rest));
        continue;
      }
      const entry = {};
      entry[match[1]] = match[2] === '' ? valueAfterKey(indent) : parseScalarValue(match[2]);
      while (
        cursor < lines.length &&
        lines[cursor].indent === childIndent &&
        !lines[cursor].text.startsWith('-')
      ) {
        const child = lines[cursor].text.match(KEY);
        cursor += 1;
        if (!child) continue;
        entry[child[1]] =
          child[2] === '' ? valueAfterKey(childIndent) : parseScalarValue(child[2]);
      }
      out.push(entry);
    }
    return out;
  }

  return node(0);
}

/**
 * Count the `- ` entries under a top-level key in the raw source.
 * Used to prove the parse was complete rather than silently truncated.
 */
export function countEntries(text, key) {
  const lines = String(text).split('\n');
  let count = 0;
  let inside = false;
  let baseIndent = -1;
  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)[0].length;
    if (!inside) {
      if (indent === 0 && line.trim() === `${key}:`) inside = true;
      continue;
    }
    if (indent === 0) break;
    if (baseIndent < 0 && line.trim().startsWith('-')) baseIndent = indent;
    if (indent === baseIndent && line.trim().startsWith('-')) count += 1;
  }
  return count;
}
