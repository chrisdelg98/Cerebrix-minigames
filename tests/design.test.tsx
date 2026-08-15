import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { routes } from '@core/router';
import { Cell } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { Modal } from '@design/components/Modal';
import { SettingsToggles } from '@design/components/SettingsToggles';
import { ToastProvider, useToast } from '@design/components/Toast';
import { MOTION_KEY, THEME_KEY } from '@design/preferences';

/** Phase 2 acceptance (docs/PLAN.md). */

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset['motion'];
  document.documentElement.dataset['theme'] = 'dark';
});

afterEach(() => {
  delete document.documentElement.dataset['motion'];
});

describe('theme and motion preferences', () => {
  it('flips the theme on <html> and persists it where the anti-FOUC script looks', async () => {
    const user = userEvent.setup();
    render(<SettingsToggles />);

    await user.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }));

    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('light');
    });
    // Same key index.html reads before first paint. If these drift, the page
    // flashes the wrong theme on every load.
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('turns motion down from inside the app, not only from the OS', async () => {
    const user = userEvent.setup();
    render(<SettingsToggles />);

    await user.click(screen.getByRole('button', { name: 'Reducir animaciones' }));

    await waitFor(() => {
      expect(document.documentElement.dataset['motion']).toBe('reduced');
    });
    expect(localStorage.getItem(MOTION_KEY)).toBe('reduced');

    await user.click(screen.getByRole('button', { name: 'Activar animaciones' }));

    await waitFor(() => {
      expect(document.documentElement.dataset['motion']).toBeUndefined();
    });
  });
});

describe('Cell', () => {
  it('exposes its state and a readable label, not just a colour', () => {
    render(<Cell state="error" value={7} label="fila 1, columna 2, con error" />);

    const cell = screen.getByRole('gridcell', { name: 'fila 1, columna 2, con error' });
    expect(cell).toHaveAttribute('data-state', 'error');
    expect(cell).toHaveTextContent('7');
  });

  it('marks the block edges a board asks for', () => {
    render(<Cell label="celda" blockEdges={['right', 'bottom']} />);

    const cell = screen.getByRole('gridcell');
    expect(cell).toHaveAttribute('data-edge-right', 'true');
    expect(cell).toHaveAttribute('data-edge-bottom', 'true');
    expect(cell).toHaveAttribute('data-edge-top', 'false');
  });
});

describe('Grid', () => {
  it('does not assume a square board', () => {
    render(
      <Grid cols={8} rows={5} label="Tablero rectangular">
        <Cell label="celda" />
      </Grid>
    );

    const grid = screen.getByRole('grid', { name: 'Tablero rectangular' });
    expect(grid).toHaveAttribute('aria-colcount', '8');
    expect(grid).toHaveAttribute('aria-rowcount', '5');
  });
});

describe('Modal', () => {
  it('opens, and routes every close through one handler', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          title="Un modal"
          actions={
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cerrar
            </button>
          }
        >
          Contenido
        </Modal>
      );
    }

    render(<Harness />);

    const dialog = screen.getByRole('heading', { name: 'Un modal' }).closest('dialog');
    expect(dialog).not.toBeNull();
    await waitFor(() => {
      expect(dialog?.open).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => {
      expect(dialog?.open).toBe(false);
    });
  });
});

describe('Toast', () => {
  it('announces through a single polite live region', async () => {
    const user = userEvent.setup();

    function Harness() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast.show('Guardado', { tone: 'success' });
          }}
        >
          Mostrar
        </button>
      );
    }

    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar' }));

    const region = await screen.findByRole('status');
    expect(within(region).getByText('Guardado')).toBeInTheDocument();
  });
});

describe('kitchen sink', () => {
  it('renders every shared component in its states', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/kitchen-sink'] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Kitchen sink' })).toBeInTheDocument();

    // The seven cell states of docs/DESIGN_SYSTEM.md §9, plus both boards.
    for (const state of ['empty', 'filled', 'fixed', 'selected', 'peer', 'same', 'error', 'hint']) {
      expect(screen.getByRole('gridcell', { name: `Celda ${state}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('grid', { name: 'Tablero de ejemplo' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Tablero rectangular' })).toBeInTheDocument();
  });
});
