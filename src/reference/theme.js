/**
 * Design tokens.
 *
 * Inline styles keep this reference dependency-free and make every value visible
 * where it is used. Replace with your styling layer (CSS modules, Tailwind,
 * styled-components) — the token names are the contract, not the mechanism.
 */

export const color = {
  canvas: '#EDEFEC',
  panel: '#FFFFFF',
  panelSoft: '#FAFBFA',
  wash: '#F1F3F0',
  border: '#DDE2DE',
  borderSoft: '#EDEFEC',
  borderHair: '#E4E8E4',
  ink: '#16202A',
  inkSoft: '#24323D',
  body: '#4A5A66',
  muted: '#6B7780',
  label: '#8B958D',
  faint: '#9AA49C',
  fainter: '#A3ADA5',
  accent: '#0E7C86',
  accentDeep: '#0A5F67',
  blue: '#2A6FA8',
  purple: '#6B57A3',
  amber: '#B07A1E',
  amberWash: '#FBF8F2',
  green: '#2E7D5B',
  danger: '#B5453A',
  note: '#F5A623',
  noteInk: '#3A2A08',
};

export const font = {
  sans: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

export const size = {
  topBar: 52,
  statusBar: 26,
  sidebar: 252,
  properties: 316,
  laneLabel: 172,
  cell: 218,
  stageGutter: 92,
};

export const radius = { sm: 4, md: 6, lg: 7, xl: 8, pill: 999 };

/** Per-lane-kind card palette: [fill, border, ink, borderStyle]. */
export const laneTint = {
  evidence: { fill: '#FFFFFF', border: '#CBD6DE', ink: '#4A5A66', borderStyle: 'dashed' },
  customer: { fill: '#DCE9F3', border: '#B0C9DE', ink: '#173B55', borderStyle: 'solid' },
  frontstage: { fill: '#E7F0F7', border: '#C6DAE9', ink: '#1B3E56', borderStyle: 'solid' },
  technology: { fill: '#EEF3F7', border: '#CFDEEA', ink: '#28455C', borderStyle: 'solid' },
  backstage: { fill: '#D6EDE7', border: '#A9D8CE', ink: '#12433C', borderStyle: 'solid' },
  support: { fill: '#E7F4F0', border: '#C2E2DA', ink: '#154841', borderStyle: 'solid' },
  custom: { fill: '#F1F1EC', border: '#DCDCD4', ink: '#33352E', borderStyle: 'solid' },
};

export const tintFor = (kind) => laneTint[kind] || laneTint.custom;

/** Stroke colour per semantic connection type. */
export const connectionColor = {
  interaction: color.blue,
  dependency: color.accent,
  supports: color.accent,
  'system-call': color.purple,
  triggers: color.label,
  'data-flow': color.amber,
};

export const strokeFor = (type) => connectionColor[type] || color.label;

/** Shared control styles, so buttons and inputs stay consistent across panels. */
export const control = {
  input: {
    width: '100%',
    height: 32,
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    padding: '0 9px',
    outline: 'none',
    background: color.panel,
  },
  select: {
    width: '100%',
    height: 32,
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    padding: '0 6px',
    outline: 'none',
    background: color.panel,
  },
  textarea: {
    width: '100%',
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    padding: '7px 9px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.4,
    fontSize: 12,
  },
  primary: {
    height: 32,
    padding: '0 14px',
    border: `1px solid ${color.ink}`,
    borderRadius: radius.lg,
    background: color.ink,
    color: color.panel,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  },
  secondary: {
    height: 32,
    padding: '0 12px',
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    background: color.panel,
    cursor: 'pointer',
    fontSize: 12,
  },
  quiet: {
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    color: color.accent,
    fontSize: 11,
    padding: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: color.label,
  },
  fieldLabel: { fontSize: 10, color: color.label, marginBottom: 4 },
  mono: { fontFamily: font.mono, fontSize: 10, color: color.fainter },
};

/** Pill/chip style used by every filter and picker. */
export const chip = (active, tone = color.accent) => ({
  border: `1px solid ${active ? tone : '#E1E5E1'}`,
  background: active ? tone : color.panel,
  color: active ? color.panel : color.body,
  borderRadius: radius.pill,
  padding: '3px 9px',
  fontSize: 11,
  cursor: 'pointer',
  lineHeight: 1.3,
});

/** Segmented-control tab style. */
export const tab = (active) => ({
  height: 24,
  padding: '0 12px',
  border: 0,
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  background: active ? color.panel : 'transparent',
  color: active ? color.ink : color.muted,
  boxShadow: active ? '0 1px 2px rgba(22,32,42,0.12)' : 'none',
});
