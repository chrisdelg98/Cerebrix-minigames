import { useMotion, useTheme } from '../../preferences';
import { MoonIcon, MotionIcon, MotionOffIcon, SunIcon } from '../../sprites/SettingsIcons';
import { IconButton } from '../IconButton';

import s from './SettingsToggles.module.css';

/**
 * Theme and motion, the two preferences that change the whole app.
 *
 * Reducing motion is offered in-app and not only through the OS setting:
 * plenty of people want a calm board without turning off animation everywhere
 * else on their device (docs/DESIGN_SYSTEM.md §5.5).
 */
export function SettingsToggles() {
  const [theme, setTheme] = useTheme();
  const [motion, setMotion] = useMotion();

  return (
    <div className={s.toggles}>
      <IconButton
        label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        aria-pressed={theme === 'light'}
        onClick={() => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
      />

      <IconButton
        label={motion === 'full' ? 'Reducir animaciones' : 'Activar animaciones'}
        icon={motion === 'full' ? <MotionIcon /> : <MotionOffIcon />}
        aria-pressed={motion === 'reduced'}
        onClick={() => {
          setMotion(motion === 'full' ? 'reduced' : 'full');
        }}
      />
    </div>
  );
}
