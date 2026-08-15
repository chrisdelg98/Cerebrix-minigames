import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { type AnyGameModule } from '@core/contract';
import { REGISTRY, type RegistryEntry } from '@core/registry';
import { Home } from '@core/shell/Home';

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
    estimatedMinutes: [3, 7],
  },
  icon: FakeIcon,
  load: () => Promise.reject(new Error('never loaded: Home must not need the module')),
};

describe('registry', () => {
  it('keeps every preview in sync with the real module metadata', async () => {
    for (const entry of REGISTRY) {
      const loaded: { default: AnyGameModule } = await entry.load();
      const { meta } = loaded.default;

      expect(entry.id, 'registry id must equal the module id').toBe(meta.id);
      expect(entry.preview).toEqual({
        id: meta.id,
        name: meta.name,
        tagline: meta.tagline,
        difficulties: meta.difficulties,
        tags: meta.tags,
        estimatedMinutes: meta.estimatedMinutes,
      });
    }
  });
});

describe('Home', () => {
  it('renders one card per registry entry', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(REGISTRY.length);
  });

  it('shows a newly registered game without any other file changing', () => {
    render(
      <MemoryRouter>
        <Home entries={[...REGISTRY, fakeEntry]} />
      </MemoryRouter>
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
