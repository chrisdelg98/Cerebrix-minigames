interface SpriteProps {
  size?: number;
}

/**
 * Quince figuras planas, distintas por SILUETA y no solo por color.
 *
 * Un juego de memoria que se apoya en el color deja afuera a quien no lo
 * distingue, y además se vuelve más difícil para todos: la forma se recuerda
 * mejor que el tono. El color acompaña, no carga el significado.
 */
const SHAPES = [
  'M12 3l2.6 6.1 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.3 1.5-6.3L3 9.7l6.4-.6z',
  'M12 4a8 8 0 100 16 8 8 0 000-16z',
  'M5 5h14v14H5z',
  'M12 4l8 15H4z',
  'M12 4l8 8-8 8-8-8z',
  'M12 20S4 14.6 4 9.8A4 4 0 0112 8a4 4 0 018 1.8C20 14.6 12 20 12 20z',
  'M8 3h8v6h5l-9 12L3 9h5z',
  'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  'M12 3c3 3.6 5 6.4 5 9a5 5 0 01-10 0c0-2.6 2-5.4 5-9z',
  'M7 4h10l-4 8h4l-9 8 3-8H7z',
  'M4 12a8 8 0 1116 0 8 8 0 01-16 0zm4 0a4 4 0 108 0 4 4 0 00-8 0z',
  'M12 3l3 6 6-1-4 5 4 5-6-1-3 6-3-6-6 1 4-5-4-5 6 1z',
  'M6 4h12v5H6zm0 7h12v9H6z',
  'M12 4c4 0 7 3 7 6s-3 4-3 6-1 4-4 4-4-2-4-4-3-3-3-6 3-6 7-6z',
];

/**
 * Una carta tapada y otra dada vuelta, con su figura.
 *
 * Dos rectángulos iguales no decían "cartas" ni "pares": eran dos bloques, y en
 * la portada se confundían con los de Secuencia y los de 2048. Que una esté llena y
 * la otra abierta con una figura adentro es lo que hace la escena — hay algo
 * escondido y algo revelado, que es el juego.
 */
export function MemoryIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Tapada. */}
      <rect x="2.5" y="4" width="8.6" height="16" rx="2" fill="currentColor" opacity="0.38" />

      {/* Dada vuelta: el contorno es la carta y el disco, su figura. */}
      <rect x="13.4" y="4" width="8.6" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.7" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Shape({ id }: { id: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={SHAPES[id % SHAPES.length]} fill="currentColor" />
    </svg>
  );
}
