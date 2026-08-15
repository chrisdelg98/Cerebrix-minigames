import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Skeleton } from '@design/components/Skeleton';

import s from './RootLayout.module.css';

/**
 * Everything outside the routes: the skip link and the fallback shown while a
 * lazily routed chunk is in flight. A shaped skeleton, never a full-screen
 * spinner (docs/DESIGN_SYSTEM.md §5.4).
 */
export function RootLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}

function RouteFallback() {
  return (
    <div className={s.fallback} id="main">
      <Skeleton h="var(--sp-6)" w="40%" label="Cargando" />
      <Skeleton h="var(--sp-8)" />
      <Skeleton h="var(--sp-8)" />
    </div>
  );
}
