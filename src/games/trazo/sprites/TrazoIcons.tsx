interface SpriteProps {
  size?: number;
}

/** El icono de la tarjeta: un trazo que dobla y no se corta. */
export function TrazoIcon({ size = 24 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 19V9a3 3 0 013-3h4a3 3 0 013 3v6a2 2 0 002 2h2" />
      <circle cx="5" cy="19" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
