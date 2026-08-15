import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { Home } from './shell/Home';
import { NotFound } from './shell/NotFound';
import { RootLayout } from './shell/RootLayout';

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
    children: [
      { index: true, element: <Home /> },
      {
        path: 'game/:gameId',
        lazy: async () => {
          const { GameRoute } = await import('./shell/GameRoute');
          return { Component: GameRoute };
        },
      },
      {
        path: 'historial',
        lazy: async () => {
          const { History } = await import('./shell/History');
          return { Component: History };
        },
      },
      {
        // The design system, documenting itself. Lazily routed: nobody
        // downloads it unless they go looking for it.
        path: 'kitchen-sink',
        lazy: async () => {
          const { KitchenSink } = await import('@design/kitchen-sink/KitchenSink');
          return { Component: KitchenSink };
        },
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
