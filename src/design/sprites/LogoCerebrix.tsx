import s from './LogoCerebrix.module.css';

export interface LogoCerebrixProps {
  size?: number;
}

/**
 * Inline SVG, animated from the component's stylesheet — no <style> inside the
 * SVG, no external asset, themed through currentColor.
 * Reference: docs/DESIGN_SYSTEM.md §6.
 */
export function LogoCerebrix({ size = 28 }: LogoCerebrixProps) {
  return (
    <svg
      className={s.logo}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Cerebrix"
    >
      <path className={s.stroke} d="M12 4.5C9 4.5 7 6.3 7 8.6c-1.6.7-2.5 2-2.5 3.6s.9 3 2.5 3.7" />
      <path className={s.stroke} d="M12 4.5c3 0 5 1.8 5 4.1 1.6.7 2.5 2 2.5 3.6s-.9 3-2.5 3.7" />
      <path className={s.stroke} d="M12 4.5v15" />
      <path className={s.stroke} d="M7 15.9c0 2.2 2.2 3.6 5 3.6s5-1.4 5-3.6" />
      <circle className={s.node} cx="8.6" cy="10.4" r="1.35" fill="currentColor" stroke="none" />
      <circle className={s.node} cx="15.4" cy="13.2" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}
