import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import s from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required: an icon alone says nothing to a screen reader. */
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'solid';
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={s.iconButton}
      data-variant={variant}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  );
}
