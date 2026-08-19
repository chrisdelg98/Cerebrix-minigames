import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { routes } from '@core/router';
import { RouteError } from '@core/shell/RouteError';

/**
 * Lo que ve el jugador cuando una ruta se rompe.
 *
 * Un usuario de iOS entró al historial y se encontró con la pantalla de
 * desarrollo de React Router: en inglés, con el error crudo
 * ("'text/html' is not a valid JavaScript MIME type") y un saludo que empezaba
 * con "Hey developer". El árbol de rutas no declaraba errorElement.
 */

function renderThrowing(cause: unknown) {
  const tree: RouteObject[] = [
    {
      path: '/',
      loader: () => {
        throw cause;
      },
      element: <p>nunca se ve</p>,
      errorElement: <RouteError />,
    },
  ];
  render(<RouterProvider router={createMemoryRouter(tree, { initialEntries: ['/'] })} />);
}

describe('la pantalla de error de ruta', () => {
  it('el árbol real la declara, así que nada cae en la pantalla de React Router', () => {
    expect(routes[0]?.errorElement).toBeDefined();
  });

  /*
   * El caso que reportaron: la app se redeployó, los hashes de los chunks
   * cambiaron, y una pestaña vieja pidió uno que ya no está.
   */
  it('reconoce el chunk viejo y dice que hay una versión nueva', async () => {
    renderThrowing(new Error("'text/html' is not a valid JavaScript MIME type."));

    expect(await screen.findByText('Hay una versión nueva')).toBeInTheDocument();
    expect(screen.getByText(/tus partidas están guardadas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
  });

  it('reconoce también las otras redacciones del mismo fallo', async () => {
    renderThrowing(new Error('Failed to fetch dynamically imported module: /assets/History.js'));
    expect(await screen.findByText('Hay una versión nueva')).toBeInTheDocument();
  });

  it('para cualquier otro error dice algo genérico, pero en español y con salida', async () => {
    renderThrowing(new Error('algo raro'));

    expect(await screen.findByText('Algo se rompió')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('nunca le habla al desarrollador', async () => {
    renderThrowing(new Error("'text/html' is not a valid JavaScript MIME type."));
    await screen.findByText('Hay una versión nueva');

    expect(document.body.textContent).not.toMatch(/Hey developer|ErrorBoundary|MIME/i);
  });
});
