interface SpriteProps {
  size?: number;
}

/** Un cuerpo que dobla y la fruta adelante. */
export function SnakeIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 17h6a2 2 0 0 0 2-2V9a2 2 0 0 1 2-2h3"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19.4" cy="7" r="2.4" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
