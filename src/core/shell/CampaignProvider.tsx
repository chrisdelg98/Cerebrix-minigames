import { type ReactNode } from 'react';

import { CampaignContext, useCampaignState } from '../hooks/useCampaign';

/** Envuelve la app entera: la campaña sobrevive a moverse entre rutas. */
export function CampaignProvider({ children }: { children: ReactNode }) {
  const api = useCampaignState();
  return <CampaignContext.Provider value={api}>{children}</CampaignContext.Provider>;
}
