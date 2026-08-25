import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { REGISTRY, type RegistryEntry } from '@core/registry';
import { Home } from '@core/shell/Home';
import { CampaignProvider } from '@core/shell/CampaignProvider';
import { StorageContext } from '@core/storageContext';
import { ToastProvider } from '@design/components/Toast';
import { LocalStorageDriver } from '@storage/localStorageDriver';

/**
 * Phase 1 acceptance (docs/PLAN.md): Home is painted from the registry, and
 * adding a game means adding an entry — nothing else.
 */

function FakeIcon() {
  return <svg aria-hidden="true" />;
}

const fakeEntry: RegistryEntry = {
  id: '__fake__',
  preview: {
    id: '__fake__',
    name: 'Juego inventado',
    tagline: 'No existe en ningún lado salvo en este test.',
    difficulties: [2, 4],
    tags: ['memoria'],
    category: 'arcade',
    estimatedMinutes: [3, 7],
  },
  icon: FakeIcon,
  load: () => Promise.reject(new Error('never loaded: Home must not need the module')),
};

describe('registry', () => {
  it('keeps every preview in sync with the real module metadata', async () => {
    for (const entry of REGISTRY) {
      // Sin anotar: el registro tiene juegos por turnos y con reloj, y los
      // campos que la portada pinta son los mismos en las dos metadatas.
      const loaded = await entry.load();
      const { meta } = loaded.default;

      expect(entry.id, 'registry id must equal the module id').toBe(meta.id);
      expect(entry.preview).toEqual({
        id: meta.id,
        name: meta.name,
        tagline: meta.tagline,
        difficulties: meta.difficulties,
        tags: meta.tags,
        category: meta.category,
        estimatedMinutes: meta.estimatedMinutes,
      });
    }
  });
});

/** Home lives inside the shell's providers, so it is tested inside them too. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <StorageContext.Provider value={new LocalStorageDriver()}>
      <ToastProvider>
        {/* La portada muestra el estado de la campaña, así que necesita su
            proveedor — igual que necesita el almacenamiento. */}
        <CampaignProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </CampaignProvider>
      </ToastProvider>
    </StorageContext.Provider>
  );
}

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders one card per registry entry', () => {
    render(
      <Shell>
        <Home />
      </Shell>
    );

    // `_dummy` está registrado pero oculto: tiene ruta, no tarjeta.
    expect(screen.getAllByRole('listitem')).toHaveLength(
      REGISTRY.filter((entry) => entry.hidden !== true).length
    );
  });

  it('shows a newly registered game without any other file changing', () => {
    render(
      <Shell>
        <Home entries={[...REGISTRY, fakeEntry]} />
      </Shell>
    );

    expect(screen.getByText('Juego inventado')).toBeInTheDocument();
    expect(screen.getByText('No existe en ningún lado salvo en este test.')).toBeInTheDocument();
    // Painted from `preview` alone: the module was never loaded.
    expect(screen.getByRole('link', { name: /Juego inventado/ })).toHaveAttribute(
      'href',
      '/game/__fake__'
    );
  });
});

/**
 * El filtro por categoría. Como la grilla, sale del registro: las pastillas son
 * las categorías que los juegos declaran, no una lista escrita en Home.
 */
describe('Home — filtro por categoría', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const names = () => screen.getAllByRole('listitem').map((li) => li.textContent ?? '');

  /* Las cuentas salen del registro, no escritas acá: registrar un juego nuevo
     no debería romper estos tests, que es justo lo que prueban. */
  const offered = REGISTRY.filter((entry) => entry.hidden !== true);
  const inShelf = (category: string) =>
    offered.filter((entry) => entry.preview.category === category).length;

  it('ofrece un estante por categoría presente, más "Todos"', () => {
    render(
      <Shell>
        <Home />
      </Shell>
    );

    const chips = screen.getAllByRole('radio');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      // El número es la cuenta de juegos que quedan al elegirlo.
      `Todos${String(offered.length)}`,
      `Lógica${String(inShelf('lógica'))}`,
      `Arcade${String(inShelf('arcade'))}`,
    ]);
    // Se abre sin filtrar: la portada sigue mostrando todo.
    expect(screen.getByRole('radio', { name: /Todos/ })).toBeChecked();
  });

  it('acorta la grilla al estante elegido', async () => {
    const user = userEvent.setup();
    render(
      <Shell>
        <Home />
      </Shell>
    );

    expect(names()).toHaveLength(offered.length);

    await user.click(screen.getByRole('radio', { name: /Arcade/ }));

    const arcade = names();
    expect(arcade).toHaveLength(inShelf('arcade'));
    expect(arcade.join(' ')).toContain('Memoria');
    expect(arcade.join(' ')).toContain('Secuencia');
    expect(arcade.join(' ')).not.toContain('Sudoku');

    await user.click(screen.getByRole('radio', { name: /Lógica/ }));
    expect(names()).toHaveLength(inShelf('lógica'));
    expect(names().join(' ')).toContain('Sudoku');
    expect(names().join(' ')).not.toContain('Secuencia');

    await user.click(screen.getByRole('radio', { name: /Todos/ }));
    expect(names()).toHaveLength(offered.length);
  });

  it('recuerda el estante al volver de un juego', async () => {
    const user = userEvent.setup();
    const view = render(
      <Shell>
        <Home />
      </Shell>
    );

    await user.click(screen.getByRole('radio', { name: /Arcade/ }));
    view.unmount();

    render(
      <Shell>
        <Home />
      </Shell>
    );

    expect(screen.getByRole('radio', { name: /Arcade/ })).toBeChecked();
    expect(names()).toHaveLength(inShelf('arcade'));
  });

  it('descubre una categoría nueva sin que Home cambie', () => {
    render(
      <Shell>
        <Home entries={[...REGISTRY, fakeEntry]} />
      </Shell>
    );

    // fakeEntry es 'arcade': el estante crece solo, sin tocar este archivo.
    expect(screen.getByRole('radio', { name: /Arcade/ })).toHaveTextContent(
      String(inShelf('arcade') + 1)
    );
  });

  it('no dibuja el filtro cuando hay un solo estante', () => {
    const soloLogica = REGISTRY.filter((entry) => entry.preview.category === 'lógica');

    render(
      <Shell>
        <Home entries={soloLogica} />
      </Shell>
    );

    // Un control con una sola opción real es ruido, no un filtro.
    expect(screen.queryByRole('radiogroup', { name: 'Categoría' })).not.toBeInTheDocument();
  });
});
