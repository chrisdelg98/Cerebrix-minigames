import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import s from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `accent` is the quiet sibling of `primary`: same colour, outlined instead
   * of filled. Two actions of the same kind should look related without both
   * shouting.
   */
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  /** Stretches the button to fill its container — the mobile action bar. */
  block?: boolean;
}

/**
 * Soft neobrutalism: solid offset shadow, and on press the shadow collapses
 * while the button travels the same distance, so it sinks without resizing.
 * Reference: docs/DESIGN_SYSTEM.md §4.
 */
export function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  block = false,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={s.button}
      data-variant={variant}
      data-size={size}
      data-block={block}
      {...rest}
    >
      {icon !== undefined && <span className={s.icon}>{icon}</span>}
      {children !== undefined && <span className={s.label}>{children}</span>}
    </button>
  );
}
