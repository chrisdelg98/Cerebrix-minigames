import { Link, useRouteError } from 'react-router-dom';

import { Button } from '@design/components/Button';

import s from './RouteError.module.css';

/**
 * La última red del router. Sin esto, cualquier error de ruta le pinta al
 * jugador la pantalla de desarrollo de React Router — en inglés, con el stack y
 * un consejo dirigido a quien escribió la app.
 *
 * Le pasó a un usuario de iOS al entrar al historial: leyó
 * "'text/html' is not a valid JavaScript MIME type" y un saludo que empezaba
 * con "Hey developer".
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isStaleChunk(error);

  return (
    <div className={s.error} id="main">
      <h1 className={s.title}>{stale ? 'Hay una versión nueva' : 'Algo se rompió'}</h1>

      <p className={s.text}>
        {stale
          ? 'La app se actualizó mientras la tenías abierta. Recargá y seguís donde estabas: tus partidas están guardadas.'
          : 'No pudimos abrir esa pantalla. Tus partidas guardadas no se tocaron.'}
      </p>

      <div className={s.actions}>
        <Button
          variant="primary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Recargar
        </Button>
        <Link to="/" className={s.home}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

/**
 * ¿Es el error de "pedí un chunk y me devolvieron el index.html"?
 *
 * No hay un tipo de error para esto: cada navegador lo redacta distinto, así
 * que se reconoce por el texto. Errar de más solo cambia qué mensaje se muestra
 * — el botón de recargar es el mismo — así que el reconocimiento es amplio a
 * propósito.
 */
function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /MIME type|dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    message
  );
}
