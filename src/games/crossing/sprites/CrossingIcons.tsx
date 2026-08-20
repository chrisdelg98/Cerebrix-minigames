interface SpriteProps {
  size?: number;
}

/** Dos carriles con tráfico y alguien parado en el hueco. */
export function CrossingIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Los carriles. */}
      <rect x="1" y="4.5" width="22" height="5" rx="1.6" fill="currentColor" opacity="0.18" />
      <rect x="1" y="14.5" width="22" height="5" rx="1.6" fill="currentColor" opacity="0.18" />

      {/* El tráfico, en direcciones opuestas. */}
      <rect x="2.5" y="5.8" width="6" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="13" y="5.8" width="6" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="6" y="15.8" width="6" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="16.5" y="15.8" width="5" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />

      {/* Quien cruza, en el hueco entre los dos carriles. */}
      <rect x="9.6" y="10.4" width="4.8" height="3.2" rx="1.2" fill="currentColor" />
    </svg>
  );
}
