interface SpriteProps {
  size?: number;
}

/** Un cuadrado repartido en rectángulos, cada uno con su número: el juego entero. */
export function ShikakuIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* Los cortes que reparten el cuadrado. */}
      <path
        d="M2.5 10.5h9M11.5 2.5v19M11.5 16h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Un punto por pieza, donde iría su número. */}
      <circle cx="7" cy="6.5" r="1.5" fill="currentColor" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="16.5" cy="9" r="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="16.5" cy="18.7" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
