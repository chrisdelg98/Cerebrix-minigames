import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '../../preferences';

import s from './Confetti.module.css';

export interface ConfettiProps {
  /** Flip to true once, when the game is won. */
  active: boolean;
  /** Moderate by default: enough to feel like a celebration, not a screensaver. */
  pieces?: number;
}

/* Siete estallidos, el último puede salir a los 2600 ms, y sus chispas duran
   hasta 1560 ms más: la animación tiene que llegar hasta ahí o se corta
   encendida. Los últimos dos alargan la secuencia, no la apuran. */
const DURATION_MS = 4000;

/**
 * How long the confetti takes to reach the top of its arc, and how high that
 * arc goes as a share of the screen.
 *
 * Both the launch speed and the gravity are DERIVED from these two numbers
 * rather than tuned by hand. Hand-tuned constants only look right at the size
 * they were tuned at: the old ones threw the paper clean off the top of a phone
 * and it never came back, because a fixed speed in pixels is an enormous speed
 * on a small screen.
 */
const RISE_MS = 900;
const RISE_SHARE = 0.62;

const BURSTS = 7;
const SPARKS_PER_BURST = 70;
const SPARK_LIFE_MS = 1500;

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
  /** When this particular piece starts dissolving. */
  fadeAt: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  radius: number;
  color: string;
}

/**
 * Victory confetti and a few fireworks, on a canvas that unmounts when it is done.
 *
 * A canvas and not DOM nodes: a couple of hundred elements animating for three
 * seconds is a couple of hundred style recalculations per frame, on the one
 * screen where the player is meant to feel good (docs/DESIGN_SYSTEM.md §5.2,
 * rule 4).
 */
export function Confetti({ active, pieces = 180 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;

    // A celebration nobody asked for is exactly what reduced motion is about.
    if (prefersReducedMotion()) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Colours come from the tokens, so the celebration follows a theme change
    // like everything else instead of being the one hardcoded palette in the app.
    const styles = getComputedStyle(document.documentElement);
    const palette = ['--c-accent', '--c-gold', '--c-success', '--c-info', '--c-danger']
      .map((token) => styles.getPropertyValue(token).trim())
      .filter(Boolean);
    const pick = (i: number): string => palette[i % palette.length] ?? '#fff';

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const launch = (2 * RISE_SHARE * height) / RISE_MS;
    const gravity = launch / RISE_MS;

    // Two jets from the lower corners, angled inward — the shape a real popper
    // makes. Raining from the top reads as weather, not as a win.
    const confetti: Piece[] = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const power = 0.72 + Math.random() * 0.42;

      return {
        // Un chorro real no sale de un punto: la boca tiembla un poco.
        x: (fromLeft ? width * 0.08 : width * 0.92) + (Math.random() - 0.5) * width * 0.06,
        y: height * (0.94 + Math.random() * 0.05),
        vx: (fromLeft ? 1 : -1) * launch * (0.24 + Math.random() * 0.52),
        vy: -launch * power,
        size: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.02,
        color: pick(i),
        wobble: Math.random() * Math.PI,
        // Staggered, so the field thins out gradually instead of blinking off
        // all at once — and every piece dissolves in view rather than leaving.
        fadeAt: DURATION_MS * (0.4 + Math.random() * 0.3),
      };
    });

    /*
     * Los estallidos se sortean en cada victoria: dónde, cuándo y de qué color.
     *
     * Estaban escritos a mano, siempre los mismos tres lugares — y una
     * celebración que se repite igual deja de ser una celebración a la segunda
     * vez. Los márgenes son lo único fijo: nada estalla tan al borde como para
     * quedar cortado, ni en un celular angosto ni en una pantalla ancha.
     */
    const fireworks = Array.from({ length: BURSTS }, (_, i) => ({
      at: 220 + i * 360 + Math.random() * 220,
      x: 0.2 + Math.random() * 0.6,
      y: 0.16 + Math.random() * 0.3,
      color: pick(Math.floor(Math.random() * palette.length)),
    }));

    const sparks: Spark[] = [];
    let launched = 0;

    const burst = (index: number, now: number): void => {
      const spec = fireworks[index];
      if (spec === undefined) return;
      /*
       * Hasta dónde llega la nube, y de ahí sale la velocidad.
       *
       * El rozamiento hace que la distancia total sea la velocidad inicial por
       * la suma de la serie geométrica, unos 500 pasos de 16 ms — así que se
       * elige el alcance, que es lo que se puede mirar en pantalla, y la
       * velocidad se despeja. Estaba puesta a mano y daba 84 px por milisegundo:
       * las chispas se iban de la pantalla en el primer fotograma.
       */
      const reach = (Math.min(width, height) * 0.24) / 500;

      for (let i = 0; i < SPARKS_PER_BURST; i += 1) {
        /*
         * Ángulo y velocidad al azar, no repartidos parejo.
         *
         * Un ángulo cada 360/N dibuja un anillo perfecto, y un anillo perfecto
         * se lee como una figura geométrica, no como algo que explotó. La raíz
         * de un número al azar reparte las partículas por ÁREA en vez de por
         * radio, que es lo que llena el disco y lo hace ver como una nube.
         */
        const angle = Math.random() * Math.PI * 2;
        const speed = reach * Math.sqrt(Math.random()) * (0.55 + Math.random() * 0.45);

        sparks.push({
          x: width * spec.x,
          y: height * spec.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          born: now,
          // Cada chispa se apaga cuando le toca: si todas duran lo mismo, el
          // estallido desaparece de golpe y ahí es donde se siente forzado.
          life: SPARK_LIFE_MS * (0.55 + Math.random() * 0.65),
          radius: 1.6 + Math.random() * 1.6,
          color: spec.color,
        });
      }
    };

    let frame = 0;
    let previous = performance.now();
    const startedAt = previous;

    const draw = (now: number) => {
      const delta = Math.min(now - previous, 32);
      previous = now;
      const elapsed = now - startedAt;

      while (launched < fireworks.length && elapsed >= (fireworks[launched]?.at ?? 0)) {
        burst(launched, now);
        launched += 1;
      }

      context.clearRect(0, 0, width, height);

      for (const piece of confetti) {
        piece.vy += gravity * delta;
        piece.x += piece.vx * delta;
        piece.y += piece.vy * delta;
        piece.rotation += piece.spin * delta;
        piece.wobble += 0.006 * delta;

        const fade = (elapsed - piece.fadeAt) / (DURATION_MS - piece.fadeAt);
        const alpha = 1 - Math.max(0, Math.min(1, fade));
        if (alpha <= 0) continue;

        context.save();
        context.globalAlpha = alpha;
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

      /*
       * La luz se suma, así que las chispas se dibujan en `lighter`: donde se
       * superponen se aclaran en vez de embarrarse, y el centro del estallido
       * queda encendido como el de uno de verdad.
       */
      context.save();
      context.globalCompositeOperation = 'lighter';

      for (const spark of sparks) {
        const age = now - spark.born;
        if (age > spark.life) continue;

        // Drag fuerte y algo de peso: la nube frena rápido y después cae, que
        // es lo que hace una chispa de verdad.
        spark.vx *= 0.968;
        spark.vy = spark.vy * 0.968 + gravity * delta * 0.35;
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;

        const left = 1 - age / spark.life;
        context.globalAlpha = left * left;
        context.fillStyle = spark.color;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.radius * (0.45 + left * 0.55), 0, Math.PI * 2);
        context.fill();
      }

      context.restore();

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
