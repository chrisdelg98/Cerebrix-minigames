import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { Home } from './shell/Home';
import { NotFound } from './shell/NotFound';
import { RootLayout } from './shell/RootLayout';
import { RouteError } from './shell/RouteError';

/** Cuánto tiene que pasar antes de volver a intentar la recarga automática. */
const RELOAD_COOLDOWN_MS = 10_000;
const RELOAD_KEY = 'cerebrix:recarga-por-chunk';

/**
 * Recarga una sola vez cuando un chunk perezoso ya no existe en el servidor.
 *
 * El caso real: la app se redeploya, los chunks cambian de hash, y una pestaña
 * abierta desde antes sigue corriendo el código viejo. Al entrar al historial
 * pide `History-VIEJO.js`, el servidor no lo tiene, el fallback de SPA le
 * contesta index.html, y el import() muere con "'text/html' is not a valid
 * JavaScript MIME type". En iOS es lo más común de todo: una PWA instalada
 * queda suspendida días entre uso y uso.
 *
 * Recargar lo arregla entero — la página nueva pide el index nuevo y los hashes
 * nuevos — pero un deploy genuinamente roto convertiría eso en un bucle de
 * recargas. Por eso hay una ventana de enfriamiento: se intenta una vez, y si
 * el error vuelve enseguida se deja pasar hacia <RouteError>, que le explica al
 * jugador qué pasó en vez de recargar para siempre.
 */
function reloadedRecently(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return true;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return false;
  } catch {
    // Sin sessionStorage no hay forma de contar los intentos, y un bucle de
    // recargas es peor que una pantalla de error.
    return true;
  }
}

async function freshChunk<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (cause) {
    if (reloadedRecently()) throw cause;
    window.location.reload();
    // La recarga no es inmediata. Una promesa que nunca resuelve deja la
    // pantalla como estaba en vez de mostrar un error que ya se está arreglando.
    return new Promise<T>(() => {
      /* la página se está yendo */
    });
  }
}

/**
 * Exported separately from the router so tests can mount the same route tree
 * on a memory router.
 *
 * The game route is code-split: the shell's game machinery is not in the bundle
 * a visitor downloads just to look at Home.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    // Sin esto, cualquier error de ruta le muestra al jugador la pantalla de
    // desarrollo de React Router.
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'game/:gameId',
        lazy: () =>
          freshChunk(async () => {
            const { GameRoute } = await import('./shell/GameRoute');
            return { Component: GameRoute };
          }),
      },
      {
        /* Los juegos con reloj tienen su propia maquinaria — sin deshacer, sin
           partida guardada, con pausa — así que tienen su propia ruta. Ver
           src/core/arcade.ts. */
        path: 'arcade/:gameId',
        lazy: () =>
          freshChunk(async () => {
            const { ArcadeRoute } = await import('./shell/ArcadeRoute');
            return { Component: ArcadeRoute };
          }),
      },
      {
        path: 'historial',
        lazy: () =>
          freshChunk(async () => {
            const { History } = await import('./shell/History');
            return { Component: History };
          }),
      },
      {
        // The design system, documenting itself. Lazily routed: nobody
        // downloads it unless they go looking for it.
        path: 'kitchen-sink',
        lazy: () =>
          freshChunk(async () => {
            const { KitchenSink } = await import('@design/kitchen-sink/KitchenSink');
            return { Component: KitchenSink };
          }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
