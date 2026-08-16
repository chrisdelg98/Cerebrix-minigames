import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '../Button';

/** Not in lib.dom yet: Chromium-only, and the whole reason this component exists. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallButtonProps {
  icon?: ReactNode;
}

/**
 * Offers to install the app, and only when the browser says it can be.
 *
 * There is no way to ask "is this installable?" — the browser tells you once,
 * by firing an event, and that firing is the only chance to act on it. So it
 * gets captured and held. Rendering nothing is the normal case: already
 * installed, or a browser that does not do this at all (every iOS one, where
 * the path is Share → Add to Home Screen and no site can trigger it).
 */
export function InstallButton({ icon }: InstallButtonProps) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      // Without this the browser shows its own mini-infobar instead.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!prompt) return null;

  return (
    <Button
      variant="accent"
      icon={icon}
      onClick={() => {
        void prompt.prompt();
        // It can only be used once, whatever the answer.
        setPrompt(null);
      }}
    >
      Instalar la app
    </Button>
  );
}
