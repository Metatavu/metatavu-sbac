/**
 * Domain vocabulary for the service blueprint.
 *
 * Terminology follows the Nielsen Norman Group definition of a service blueprint:
 * the diagram contains *elements* arranged into *lanes* across *stages*, separated by
 * three *lines* (interaction, visibility, internal interaction), with *arrows*
 * expressing relationships and dependencies (a double arrow = codependency).
 */

/** Lane kinds. A lane's kind drives its default styling and element type — not its label. */
export const LANE_KINDS = [
  'evidence',
  'customer',
  'frontstage',
  'technology',
  'backstage',
  'support',
  'custom',
];

/** Element types. The four NN/g element classes, plus evidence and modelling extras. */
export const ELEMENT_TYPES = [
  'customer-action',
  'frontstage-action',
  'frontstage-technology',
  'backstage-action',
  'process',
  'system',
  'evidence',
  'event',
  'decision',
];

/** Default element type for a new card, by the kind of lane it is dropped into. */
export const DEFAULT_ELEMENT_TYPE = {
  evidence: 'evidence',
  customer: 'customer-action',
  frontstage: 'frontstage-action',
  technology: 'frontstage-technology',
  backstage: 'backstage-action',
  support: 'process',
  custom: 'backstage-action',
};

/** Semantic connection types. The renderer derives geometry; users never route lines. */
export const CONNECTION_TYPES = [
  'interaction',
  'dependency',
  'supports',
  'triggers',
  'system-call',
  'data-flow',
];

/** Implementation status, used in Model mode. */
export const STATUSES = ['proposed', 'planned', 'in-progress', 'implemented'];

/** Discovery markers, used in Workshop mode. */
export const MARKERS = {
  fact: { label: 'Fact', color: '#2E7D5B' },
  assumption: { label: 'Assumption', color: '#B07A1E' },
  question: { label: 'Question', color: '#6B57A3' },
  pain: { label: 'Pain point', color: '#B5453A' },
  opportunity: { label: 'Opportunity', color: '#1F7A8C' },
  idea: { label: 'Idea', color: '#A85C1E' },
};

/** Employee emotion (an NN/g secondary element). */
export const EMOTIONS = {
  positive: { label: 'Positive', color: '#2E7D5B', glyph: '+' },
  neutral: { label: 'Neutral', color: '#B07A1E', glyph: '~' },
  frustrated: { label: 'Frustrated', color: '#B5453A', glyph: '\u2212' },
};

export const DURATION_UNITS = ['seconds', 'minutes', 'hours', 'days'];

/** The three canonical blueprint lines, attached to the lane they follow. */
export const LINES = {
  INTERACTION: 'Line of interaction',
  VISIBILITY: 'Line of visibility',
  INTERNAL_INTERACTION: 'Line of internal interaction',
};

/** `true` when a divider should render as a solid rule rather than dashed. */
export const isStrongLine = (label) => /visibility/i.test(String(label || ''));
