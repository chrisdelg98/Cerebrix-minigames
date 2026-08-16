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

export function ArrowLeftIcon({ size = 20 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function HintIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2h6c0-.4.2-.9.6-1.2A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export function PlayIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

export function PlusIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function InstallIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function UndoIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

export function RedoIcon({ size = 18 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
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
