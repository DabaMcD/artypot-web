// Mirrors CSS variable values in globals.css @theme — single source of truth for JS
export const ROLE_COLORS = {
  mob:      '#F5A623',
  summoned: '#47DFD3',
  council:  '#8A2BE2',
} as const;

// Text color ON TOP of the role background (summoned teal needs dark text)
export const ROLE_TEXT_COLORS = {
  mob:      '#ffffff',
  summoned: '#0a0a0a',
  council:  '#ffffff',
} as const;

// Tailwind class equivalents for role-colored foreground text
export const ROLE_TEXT_CLASSES = {
  mob:      'text-brand',
  summoned: 'text-creator',
  council:  'text-council',
} as const;

// Human-readable labels
export const ROLE_LABELS = {
  mob:      'The Mob',
  summoned: 'The Summoned',
  council:  'The Council',
} as const;

// Full palette (for places like stripe.ts that need hex but can't use CSS vars)
export const COLORS = {
  background: '#0a0a0a',
  surface:    '#141414',
  surface2:   '#1e1e1e',
  border:     '#2a2a2a',
  foreground: '#ededed',
  muted:      '#888888',
  brand:      '#F5A623',
  brandDim:   '#c4841a',
  creator:    '#47DFD3',
  council:    '#8A2BE2',
} as const;

export type RoleKey = keyof typeof ROLE_COLORS;
