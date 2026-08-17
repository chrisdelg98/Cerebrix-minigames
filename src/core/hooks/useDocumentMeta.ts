import { useEffect } from 'react';

const SUFFIX = 'Cerebrix';

/**
 * Título y descripción por pantalla.
 *
 * Una app de una sola página sirve el mismo `<head>` para todas sus rutas, así
 * que sin esto cada juego se indexa —y se guarda en marcadores, y se muestra en
 * el historial del navegador— con el título de la portada. El buscador ejecuta
 * el JavaScript y ve el título ya cambiado; la pestaña y los marcadores también.
 *
 * La descripción se reescribe sobre la misma etiqueta que ya viene en el HTML,
 * no se agrega una segunda: dos `<meta name="description">` es un error que los
 * buscadores resuelven quedándose con cualquiera de las dos.
 */
export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title === SUFFIX ? title : `${title} · ${SUFFIX}`;

    if (description === undefined) return;
    const tag = document.querySelector('meta[name="description"]');
    tag?.setAttribute('content', description);
  }, [title, description]);
}
