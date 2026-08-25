import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Skeleton } from '@design/components/Skeleton';
import { ToastProvider } from '@design/components/Toast';

import { useForgetUnknownGames } from '../hooks/useForgetUnknownGames';

import { CampaignProvider } from './CampaignProvider';

import s from './RootLayout.module.css';

/**
 * Everything outside the routes: the skip link, the toast host, and the
 * fallback shown while a lazily routed chunk is in flight. A shaped skeleton,
 * never a full-screen spinner (docs/DESIGN_SYSTEM.md §5.4).
 */
export function RootLayout() {
  // Al arrancar, y una sola vez por visita.
  useForgetUnknownGames();

  return (
    <ToastProvider>
      {/* La campaña envuelve todo porque sobrevive a moverse entre rutas: el
          jugador salta de un juego a otro y el progreso lo sigue. */}
      <CampaignProvider>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>

        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </CampaignProvider>
    </ToastProvider>
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
