import { useRef, type ReactNode } from 'react';

import s from './SwipeArea.module.css';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface SwipeAreaProps {
  /** Se llama en cuanto el arrastre supera el umbral, no al soltar. */
  onSwipe: (direction: SwipeDirection) => void;
  /** Mientras sea `false` el área no escucha nada. */
  enabled?: boolean;
  /**
   * Cuánto hay que arrastrar para que cuente, en píxeles.
   *
   * Bajo a propósito en los juegos de reflejos: un umbral cómodo para "pasar de
   * página" llega tarde para "girar antes de la pared".
   */
  threshold?: number;
  /** Etiqueta para quien navega con lector de pantalla. */
  label?: string;
  children: ReactNode;
}

/**
 * Un área que convierte arrastres en direcciones, y que ocupa TODO lo que le
 * den.
 *
 * Existe por una queja concreta: en Snake el gesto vivía sobre el tablero, así
 * que para girar había que taparlo con la mano justo cuando hacía falta verlo.
 * Separar dónde se mira de dónde se toca es lo que arregla eso — y no es una
 * necesidad de Snake nada más: 2048 y Cruzar la calle tenían cada uno su propia
 * copia del mismo gesto.
 *
 * Vive en /design porque no sabe qué es un juego: recibe una función y le pasa
 * una dirección.
 */
export function SwipeArea({
  onSwipe,
  enabled = true,
  threshold = 18,
  label,
  children,
}: SwipeAreaProps) {
  const from = useRef<{ x: number; y: number } | null>(null);

  /*
   * El giro sale en `pointermove`, no al levantar el dedo.
   *
   * Esperar al `pointerup` agrega el tiempo que el dedo tarde en despegarse, y
   * en un juego donde el paso dura 120 ms eso es la diferencia entre girar y
   * chocar. Y el origen se reinicia con cada giro, así que un mismo arrastre
   * encadena varios: se dibuja el recorrido con el pulgar sin levantarlo.
   */
  const onPointerMove = (event: React.PointerEvent) => {
    const start = from.current;
    if (!enabled || start === null) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (Math.abs(horizontal ? dx : dy) < threshold) return;

    onSwipe(horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    from.current = { x: event.clientX, y: event.clientY };
  };

  const forget = () => {
    from.current = null;
  };

  return (
    <div
      className={s.area}
      aria-label={label}
      onPointerDown={(event) => {
        if (!enabled) return;
        from.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={onPointerMove}
      onPointerUp={forget}
      onPointerCancel={forget}
    >
      {children}
    </div>
  );
}
