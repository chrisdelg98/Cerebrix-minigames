/**
 * La X y el O, dibujados y no escritos.
 *
 * Como texto heredaban la tipografía y quedaban de distinto peso y distinto
 * tamaño óptico —la O de una fuente es más chica que su X—, y en un tablero de
 * nueve casillas esa diferencia se lee como que una vale más que la otra.
 * Dibujados miden lo mismo y se pueden animar al aparecer.
 */
export function MarkX() {
  return (
    <svg viewBox="0 0 24 24" className="mark" aria-hidden="true" focusable="false">
      <path
        d="M6 6 L18 18 M18 6 L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarkO() {
  return (
    <svg viewBox="0 0 24 24" className="mark" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" strokeWidth="3.2" />
    </svg>
  );
}
