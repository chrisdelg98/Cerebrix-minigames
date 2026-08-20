import { lazy, Suspense } from 'react';

/*
 * `import type` y no `import { type ... }`.
 *
 * No es estilo: con `verbatimModuleSyntax`, la segunda forma deja
 * `import './SparksField'` en la salida — un import con efecto secundario que
 * ancla el módulo al grafo estático. El `lazy()` de abajo seguía existiendo,
 * pero el chunk terminaba dentro del paquete inicial y todo esto no separaba
 * nada. Verificado sobre el build.
 */
import type { SparksFieldProps } from './SparksField';

/*
 * El efecto se descarga solo cuando hace falta.
 *
 * Vive detrás de un import() para que su código y su CSS no viajen en el
 * paquete inicial: alguien que abre la app por primera vez —racha cero— no paga
 * nada por una animación que no va a ver. Los que sí la ven ya volvieron varias
 * veces, así que un chunk de más no les cuesta la primera impresión.
 */
const Field = lazy(async () => {
  const { SparksField } = await import('./SparksField');
  return { default: SparksField };
});

/**
 * Chispas sobre lo que sea que las merezca. No sabe qué es una racha: recibe
 * cuánto tiene que brillar y nada más.
 */
export function Sparks({ intensity, ring }: SparksFieldProps) {
  return (
    // Sin fallback: mientras el chunk viaja no debería aparecer un hueco donde
    // después va a haber chispas.
    <Suspense fallback={null}>
      <Field intensity={intensity} ring={ring} />
    </Suspense>
  );
}

export type { SparksFieldProps };
