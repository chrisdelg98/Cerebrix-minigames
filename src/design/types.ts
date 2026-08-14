import type { CSSProperties } from 'react';

/**
 * Style object carrying CSS custom properties.
 *
 * Passing custom properties through `style` is the one sanctioned use of inline
 * styles: a value only known at runtime and varying per element (a stagger
 * index, a column count, a cell size) cannot live in a static stylesheet. The
 * rule that consumes it still lives in a CSS Module — this only carries data.
 *
 * See docs/STYLING.md §5.
 *
 * `as` rather than `satisfies`: React types `style` as CSSProperties, and an
 * object literal with a `--*` key trips the excess property check before
 * `satisfies` can widen it.
 *
 * @example
 * <li style={{ '--i': index } as CSSVars} className="anim-stagger" />
 */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
