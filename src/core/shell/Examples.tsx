import { type GameExample } from '../contract';

import s from './Examples.module.css';

export interface ExamplesProps {
  items: GameExample[];
}

/**
 * Los ejemplos dibujados de un juego, iguales en los dos caminos.
 *
 * Existe porque no lo eran: los juegos por turnos los mostraban dentro del
 * modal de reglas —con título, marco y dos columnas que caen a una en el
 * celular— y los arcade los tiraban en un flex-wrap sin marco ni corte, así que
 * en un teléfono los dos dibujos se repartían el ancho y quedaban del tamaño de
 * una uña. Son la misma cosa en los dos lados, así que se dibujan en un solo
 * lugar.
 */
export function Examples({ items }: ExamplesProps) {
  return (
    <section className={s.examples}>
      <h3 className={s.title}>Ejemplos</h3>

      <div className={s.grid}>
        {items.map(({ figure: Figure, caption }) => (
          <figure key={caption} className={s.example}>
            <span className={s.art} aria-hidden="true">
              <Figure />
            </span>
            <figcaption>{caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
