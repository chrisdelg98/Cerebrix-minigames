import { type SpriteProps } from './SettingsIcons';

/**
 * Los glifos de los estantes de la portada. Rellenos, no de contorno.
 *
 * El resto de los sprites son trazo de 2px sobre 24×24, que es lo correcto a
 * 18–20px. Acá se dibujan a 14–16px, y a esa escala esos 2px se reducen a poco
 * más de uno: el glifo se deshilacha y deja de leerse como una figura. Una
 * silueta llena no depende del grosor del trazo, así que aguanta el achique.
 *
 * Por eso son siluetas simples y cerradas — a 14px lo que se reconoce es el
 * contorno exterior, no el detalle de adentro.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  stroke: 'none',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/** Cuatro cuadrados: la grilla entera, sin filtrar. */
export function AllGamesIcon({ size = 16 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

/**
 * Una pieza de rompecabezas: encaja o no encaja, que es de lo que se trata
 * deducir. Con salientes arriba y a la derecha, huecos abajo y a la izquierda —
 * la asimetría es lo que la hace reconocible cuando es chiquita.
 */
export function LogicIcon({ size = 16 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M6 6h2.6a2.4 2.4 0 0 1 4.8 0H16a2 2 0 0 1 2 2v2.6a2.4 2.4 0 0 1 0 4.8V18a2 2 0 0 1-2 2h-2.6a2.4 2.4 0 0 0-4.8 0H6a2 2 0 0 1-2-2v-2.6a2.4 2.4 0 0 0 0-4.8V8a2 2 0 0 1 2-2z" />
    </svg>
  );
}

/** Una palanca de arcade: bola, vástago y base. Se agarra y se juega. */
export function ArcadeIcon({ size = 16 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base}>
      <circle cx="12" cy="5.5" r="3.5" />
      <path d="M10.6 8.5h2.8v7h-2.8z" />
      <path d="M8 14.5h8l3.2 5.6a1.2 1.2 0 0 1-1 1.8H5.8a1.2 1.2 0 0 1-1-1.8z" />
    </svg>
  );
}
