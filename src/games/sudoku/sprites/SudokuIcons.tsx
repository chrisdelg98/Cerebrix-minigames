export interface SpriteProps {
  size?: number;
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/** Rides in the initial bundle: the registry imports it eagerly for Home. */
export function SudokuIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="1.2" />
    </svg>
  );
}

export function PencilIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      <path d="M14.5 5.5l3 3" />
    </svg>
  );
}

export function EraserIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M8.5 20H20" />
      <path d="M15 4.5 4.5 15a2 2 0 0 0 0 3l2.5 2.5h4L20.5 11a2 2 0 0 0 0-3L18 5.5a2 2 0 0 0-3 0z" />
      <path d="M9.5 10 15 15.5" />
    </svg>
  );
}
