import { useEffect, useMemo, useRef, useState } from 'react';

import { type CSSVars } from '../../types';

import s from './SparksField.module.css';

export interface SparksFieldProps {
  /** De 0 a 1. Cuántas chispas hay y cuánto se notan. */
  intensity: number;
  /**
   * Suma un anillo que recorre el borde en bucle.
   *
   * Es un escalón, no una rampa: la intensidad crece de a poco y esto aparece
   * de golpe. Sirve para marcar que se cruzó un techo — quien lo ve sabe que
   * llegó a algo distinto, no a un poco más de lo mismo.
   */
  ring?: boolean | undefined;
}

/** Cuántas chispas hay en el mínimo y en el máximo. */
const MIN_SPARKS = 6;
const MAX_SPARKS = 30;

/**
 * Un azar ESTABLE, derivado del índice.
 *
 * Con `Math.random()` cada renderizado le daría a cada chispa una posición
 * nueva, y como la posición vive en una variable CSS que la animación lee, el
 * efecto se reiniciaría entero cada vez que el componente se vuelve a dibujar.
 * Derivado del índice, una chispa siempre es la misma chispa.
 */
function noise(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Chispas que suben, para una racha que vale la pena cuidar.
 *
 * Son elementos con `@keyframes` y nada más: sin canvas, sin
 * `requestAnimationFrame`, sin un solo cuadro de JavaScript mientras corren.
 * Solo se animan `transform` y `opacity`, así que el trabajo lo hace el
 * compositor y la portada sigue respondiendo igual aunque esto esté encendido
 * (docs/DESIGN_SYSTEM.md §1).
 *
 * Se detiene cuando no se ve: fuera de la pantalla o con la pestaña en segundo
 * plano, las animaciones quedan en pausa en lugar de seguir consumiendo.
 */
export function SparksField({ intensity, ring = false }: SparksFieldProps) {
  const level = Math.min(1, Math.max(0, intensity));
  const count = Math.round(MIN_SPARKS + level * (MAX_SPARKS - MIN_SPARKS));
  const host = useRef<HTMLSpanElement>(null);
  const [awake, setAwake] = useState(true);

  /*
   * DOS poblaciones, no una.
   *
   * Un solo tipo de partícula repetido treinta veces se lee como una textura, no
   * como fuego. Las brasas —pocas, grandes y lentas— dan el cuerpo, y las
   * chispas —muchas, chicas y rápidas— dan la vida. La diferencia entre las dos
   * es lo que hace que parezca algo que arde en vez de puntos subiendo.
   */
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const ember = noise(i, 7) > 0.74;
        return {
          ember,
          // Alrededor del CENTRO de la llama, en píxeles.
          // En porcentaje nunca coincidían: el icono está anclado al borde
          // derecho en píxeles, así que su centro se mueve con el ancho de la
          // ficha y un 68% que servía en un teléfono caía al costado en una
          // pantalla ancha. Ver --flame-center en el CSS.
          fx: (noise(i, 1) - 0.5) * (ember ? 34 : 56),
          // Apretado: todas nacen en la base, apenas escalonadas.
          fy: (noise(i, 9) - 0.5) * 10,
          // Se abren en abanico al subir, más las chispas que las brasas.
          drift: (noise(i, 2) - 0.5) * (ember ? 26 : 54),
          rise: (ember ? 38 : 54) + noise(i, 3) * (ember ? 26 : 48),
          size: ember ? 3.5 + noise(i, 4) * 2.5 : 1.6 + noise(i, 4) * 2,
          // Repartidas en dos segundos y medio: el efecto tiene que estar en
          // régimen enseguida, no medio minuto después de abrir.
          delay: noise(i, 5) * 2.5,
          duration: ember ? 3.2 + noise(i, 6) * 2 : 1.5 + noise(i, 6) * 1.4,
          // Cada una se bambolea distinto, o las treinta subirían en formación.
          sway: (noise(i, 8) - 0.5) * 18,
        };
      }),
    [count]
  );

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const onHidden = () => {
      setAwake(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onHidden);

    // Sin IntersectionObserver simplemente no se pausa: se ve igual y no rompe.
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              setAwake(entry?.isIntersecting === true && document.visibilityState === 'visible');
            },
            { rootMargin: '64px' }
          )
        : null;
    observer?.observe(node);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      observer?.disconnect();
    };
  }, []);

  return (
    <span
      ref={host}
      className={s.field}
      data-awake={awake}
      style={{ '--level': level } as CSSVars}
      aria-hidden="true"
    >
      <span className={s.aura} />
      {ring && (
        <span className={s.ring}>
          <span className={s.sweep} />
        </span>
      )}
      {sparks.map((spark, i) => (
        <span
          key={i}
          className={s.spark}
          data-ember={spark.ember}
          style={
            {
              '--fx': `${String(spark.fx)}px`,
              '--fy': `${String(spark.fy)}px`,
              '--drift': `${String(spark.drift)}px`,
              '--sway': `${String(spark.sway)}px`,
              '--rise': `${String(spark.rise)}px`,
              '--size': `${String(spark.size)}px`,
              '--delay': `${String(spark.delay)}s`,
              '--dur': `${String(spark.duration)}s`,
            } as CSSVars
          }
        />
      ))}
    </span>
  );
}
