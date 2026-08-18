/** Id helpers. Ids are stable, human-readable and diff-friendly — never random. */

/** `"Customer pays"` -> `"customer-pays"`. */
export function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'item'
  );
}

/**
 * Derive an id from `label` that does not collide with `taken`.
 * Deterministic: the same label in the same document always yields the same id.
 */
export function uniqueId(label, taken) {
  const base = slugify(label);
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export const idsOf = (list) => list.map((entry) => entry.id);
