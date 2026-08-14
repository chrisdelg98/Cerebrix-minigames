import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../src/App';

/**
 * Phase 0 acceptance: the toolchain is wired end to end.
 * Replaced by real shell tests in Phase 1.
 */
describe('scaffold', () => {
  it('renders the app', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cerebrix');
  });

  it('resolves path aliases', async () => {
    const mod = await import('@design/types');
    expect(mod).toBeDefined();
  });
});
