// Tailwind class equivalents for role-colored foreground text
export const ROLE_TEXT_CLASSES = {
  fan:     'text-fan',
  creator: 'text-creator',
  council: 'text-council',
} as const;

// Human-readable labels
export const ROLE_LABELS = {
  fan:     'Fan',
  creator: 'Creator',
  council: 'The Council',
} as const;

export type RoleKey = keyof typeof ROLE_TEXT_CLASSES;
