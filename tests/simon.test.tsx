import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { LocalStorageDriver } from '@storage/localStorageDriver';

/**
 * El acuse de recibo del dedo en Simón.
 *
 * La secuencia la muestra la vista con temporizadores, así que todo acá corre
 * con relojes falsos: son la única forma de mirar un destello sin esperarlo.
 */

let storage: LocalStorageDriver;

const LEAD_IN_MS = 900;

function renderSimon() {
  const router = createMemoryRouter(routes, { initialEntries: ['/game/simon'] });
  return render(
    <StorageContext.Provider value={storage}>
      <RouterProvider router={router} />
    </StorageContext.Provider>
  );
}

const pads = () => screen.getAllByRole('button', { name: /^Pastilla \d+$/ });
const litPad = () => pads().findIndex((pad) => pad.dataset.lit === 'true');

function padAt(index: number): HTMLElement {
  const pad = pads()[index];
  if (!pad) throw new Error(`no hay pastilla ${String(index)}`);
  return pad;
}

/** El único paso de la ronda 1, que es a la vez el primero y el que la cierra. */
async function watchFirstRound(): Promise<number> {
  const [step] = await watchSequence(1, 620);
  if (step === undefined || step < 0) throw new Error('la secuencia no se mostró');
  return step;
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/**
 * Arranca la partida y deja el tablero listo.
 *
 * Con relojes falsos no sirven los `findBy*`: esperan con `setTimeout`, que es
 * justo lo que está congelado. Vaciar micro-tareas y temporizadores a mano hace
 * lo mismo y sin esperas reales — la ruta del juego se carga con import().
 */
/**
 * Monta el juego y lo deja en la primera ronda.
 *
 * Los relojes falsos se encienden DESPUÉS de que la pantalla de inicio esté en
 * pie. La ruta y el módulo del juego llegan por import(), y con el reloj
 * congelado el router se queda a mitad de camino y no dibuja nada. Congelarlo
 * recién al tocar "Empezar" deja adentro exactamente lo que interesa: los
 * temporizadores con los que la vista muestra la secuencia.
 */
async function renderAndStart(): Promise<void> {
  renderSimon();
  const start = await screen.findByRole('button', { name: /Empezar partida/ });
  vi.useFakeTimers();
  act(() => {
    fireEvent.click(start);
  });
}

/** Mira la ronda entera y devuelve, en orden, las pastillas que se encendieron. */
async function watchSequence(steps: number, tempoMs: number): Promise<number[]> {
  const seen: number[] = [];
  await advance(LEAD_IN_MS);
  for (let i = 0; i < steps; i += 1) {
    seen.push(litPad());
    await advance(tempoMs);
  }
  return seen;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Simón — el destello del jugador', () => {
  it('deja ver el toque que completa la ronda, no solo los del medio', async () => {
    await renderAndStart();

    const first = await watchFirstRound();

    act(() => {
      fireEvent.pointerDown(padAt(first));
    });

    // El destello tiene que durar lo suficiente para verse. Antes moría en el
    // mismo cuadro: al completar la ronda el efecto se reprograma, y su limpieza
    // se llevaba puesto el temporizador del acuse de recibo.
    expect(padAt(first).dataset.lit).toBe('true');
    await advance(120);
    expect(padAt(first).dataset.lit, 'el toque que cierra la ronda se apagó al instante').toBe(
      'true'
    );
  });

  it('ignora el segundo toque cuando el dedo rebota sobre el que cerró la ronda', async () => {
    await renderAndStart();

    const first = await watchFirstRound();

    act(() => {
      fireEvent.pointerDown(padAt(first));
    });

    // Completar la ronda deshabilita el tablero en el acto: mientras se vuelve
    // a mostrar la secuencia no hay nada que tocar.
    expect(pads().every((pad) => (pad as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByText(/Ronda/)).toHaveTextContent('Ronda 2 de 5');

    // Un segundo toque del mismo dedo no puede adelantar otro paso.
    act(() => {
      fireEvent.pointerDown(padAt(first));
    });
    expect(screen.getByText(/Ronda/)).toHaveTextContent('Ronda 2 de 5');
  });
});
