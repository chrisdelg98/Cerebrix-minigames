/**
 * Breakpoints, mobile-first — designed at 360px and expanded from there.
 *
 * Custom properties do not work inside @media, so the CSS side writes the
 * literal accompanied by a comment naming the token. This file is the other
 * half of that single source of truth, for the code that needs the number.
 * Reference: docs/DESIGN_SYSTEM.md §7.1
 */
export const BREAKPOINTS = {
  /** Large phone */
  sm: 480,
  /** Tablet, portrait */
  md: 768,
  /** Tablet landscape / laptop */
  lg: 1024,
  /** Desktop */
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export function mediaUp(breakpoint: Breakpoint): string {
  return `(width >= ${String(BREAKPOINTS[breakpoint])}px)`;
}
