import type { CSSVars } from '@design/types';
import s from './App.module.css';

/**
 * Phase 0 placeholder.
 *
 * Its only job is to prove the scaffolding works end to end: tokens resolve,
 * CSS Modules compile to camelCase, layers order correctly, the animation
 * catalogue runs, and both themes paint. The real shell arrives in Phase 1
 * (docs/PLAN.md) and replaces this file entirely.
 */
export function App() {
  const phases = [
    { id: 0, label: 'Andamiaje', done: true },
    { id: 1, label: 'Contrato + shell', done: false },
    { id: 2, label: 'Design system', done: false },
    { id: 3, label: 'Persistencia', done: false },
    { id: 4, label: 'Dificultad', done: false },
    { id: 5, label: 'Sudoku', done: false },
    { id: 6, label: 'Buscaminas', done: false },
    { id: 7, label: 'Pulido', done: false },
  ];

  return (
    <main className={s.main}>
      <div className={s.card}>
        <p className={s.eyebrow}>Fase 0 · Andamiaje</p>
        <h1 className={s.title}>Cerebrix</h1>
        <p className={s.tagline}>
          El esqueleto está en pie. Los tokens resuelven, las capas ordenan y las animaciones
          corren.
        </p>

        <ol className={s.phases}>
          {phases.map((phase, i) => (
            <li
              key={phase.id}
              className={`${s.phase} anim-stagger`}
              data-done={phase.done}
              style={{ '--i': i } satisfies CSSVars}
            >
              <span className={s.phaseIndex}>{phase.id}</span>
              <span className={s.phaseLabel}>{phase.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
