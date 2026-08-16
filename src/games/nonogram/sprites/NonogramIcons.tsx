interface SpriteProps {
  size?: number;
}

/**
 * The card icon: a tiny board mid-solve. Squares, not a picture, because the
 * picture is different every time — what stays the same is the grid.
 */
export function NonogramIcon({ size = 24 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" opacity="0.5" />
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
      <rect x="15.5" y="15.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrushIcon({ size = 18 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function CrossIcon({ size = 18 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" opacity="0.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}
