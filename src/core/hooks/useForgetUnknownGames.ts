import { useEffect } from 'react';

import { REGISTRY } from '../registry';
import { useStorage } from '../storageContext';

/** Una vez por visita alcanza: el registro no cambia mientras la app está abierta. */
const DONE_KEY = 'cerebrix:limpieza';

/**
 * Tira los datos guardados de juegos que el registro ya no conoce.
 *
 * El almacenamiento de esta app vive en el teléfono de cada jugador, y eso es
 * MÁS difícil de mantener que una base en un servidor, no menos: a una del
 * servidor le corrés una migración una vez y terminaste; a esta no la podés
 * alcanzar. Cada dispositivo se limpia solo, cuando su dueño abre la app — o no
 * se limpia nunca.
 *
 * Cubre tres casos con una sola regla, porque desde el storage los tres son
 * idénticos: un juego que se sacó del registro, uno al que le cambiaron el id, y
 * una clave escrita por un error de tipeo. En los tres queda una partida que no
 * se puede continuar, una preferencia que nadie lee y filas de historial de algo
 * que ya no existe.
 *
 * Se hace con "quedate con estos" en vez de una tabla de renombres históricos:
 * la lista de ids vigentes sale del registro y siempre está al día, mientras que
 * una lista de ids viejos hay que mantenerla a mano y crece con cada cambio.
 *
 * Existe antes de hacer falta, igual que src/storage/migrations.ts — que
 * versiona la FORMA de los registros mientras esto cubre su IDENTIDAD, que era
 * el hueco que quedaba.
 */
export function useForgetUnknownGames(): void {
  const storage = useStorage();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DONE_KEY) !== null) return;
      sessionStorage.setItem(DONE_KEY, '1');
    } catch {
      // Sin sessionStorage se corre igual: es barato y es mejor que no correr.
    }

    void storage.retainGames(REGISTRY.map((entry) => entry.id));
  }, [storage]);
}
