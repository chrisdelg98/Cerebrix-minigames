interface SpriteProps {
  size?: number;
}

/** The card icon: the two symbols, side by side, which is the whole game. */
export function TangoIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="4.2" fill="currentColor" />
      <path
        d="M20 15.6a5 5 0 0 1-6.8-6.8 5.6 5.6 0 1 0 6.8 6.8z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

export function SunGlyph({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="currentColor" />
    </svg>
  );
}

export function MoonGlyph({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 15.2A8.6 8.6 0 0 1 9.3 4a8.6 8.6 0 1 0 11.2 11.2z" fill="currentColor" />
    </svg>
  );
}
