import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '../../preferences';

import s from './Confetti.module.css';

export interface ConfettiProps {
  /** Flip to true once, when the game is won. */
  active: boolean;
  /** Moderate by default: enough to feel like a celebration, not a screensaver. */
  pieces?: number;
}

const DURATION_MS = 2600;
const GRAVITY = 0.00042;
const DRAG = 0.9975;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  /** Squash across the short axis, so a flat piece reads as tumbling. */
  wobble: number;
}

/**
 * Victory confetti on a canvas that unmounts itself when it is done.
 *
 * A canvas and not DOM nodes: 90 elements animating for two and a half seconds
 * is 90 style recalculations per frame, on the one screen where the player is
 * meant to feel good (docs/DESIGN_SYSTEM.md §5.2, rule 4).
 */
export function Confetti({ active, pieces = 90 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;

    // A celebration nobody asked for is exactly what reduced motion is about.
    if (prefersReducedMotion()) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Colours come from the tokens, so confetti follows a theme change like
    // everything else instead of being the one hardcoded palette in the app.
    const styles = getComputedStyle(document.documentElement);
    const palette = ['--c-accent', '--c-gold', '--c-success', '--c-info']
      .map((token) => styles.getPropertyValue(token).trim())
      .filter(Boolean);

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    // Two jets from the lower corners, angled inward — the shape a real popper
    // makes. Raining from the top reads as weather, not as a win.
    const confetti: Piece[] = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = 0.55 + Math.random() * 0.55;

      return {
        x: fromLeft ? width * 0.08 : width * 0.92,
        y: height * 0.95,
        vx: (fromLeft ? 1 : -1) * speed * (0.55 + Math.abs(spread)),
        vy: -speed * (1.15 + Math.random() * 0.5),
        size: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.02,
        color: palette[i % palette.length] ?? '#fff',
        wobble: Math.random() * Math.PI,
      };
    });

    let frame = 0;
    let previous = performance.now();
    const startedAt = previous;

    const draw = (now: number) => {
      const delta = Math.min(now - previous, 32);
      previous = now;
      const elapsed = now - startedAt;

      context.clearRect(0, 0, width, height);
      // Fades out over the last third rather than vanishing mid-air.
      context.globalAlpha = Math.max(
        0,
        1 - Math.max(0, elapsed - DURATION_MS * 0.66) / (DURATION_MS * 0.34)
      );

      for (const piece of confetti) {
        piece.vy += GRAVITY * delta;
        piece.vx *= DRAG;
        piece.x += piece.vx * delta;
        piece.y += piece.vy * delta;
        piece.rotation += piece.spin * delta;
        piece.wobble += 0.006 * delta;

        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        // The squash is what sells it as paper rather than as dots.
        context.fillRect(
          -piece.size / 2,
          -piece.size / 2,
          piece.size,
          piece.size * Math.abs(Math.cos(piece.wobble))
        );
        context.restore();
      }

      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [active, pieces]);

  if (!active) return null;

  return <canvas ref={canvasRef} className={s.confetti} aria-hidden="true" />;
}
