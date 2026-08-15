export interface SpriteProps {
  size?: number;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const;

export function SunIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function MotionIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M4 8h10M4 16h6" />
      <path d="M18 5l3 3-3 3" />
      <path d="M14 19l-3-3 3-3" />
    </svg>
  );
}

export function MotionOffIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M4 8h10M4 16h6" />
      <path d="M18 5l3 3-3 3" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
