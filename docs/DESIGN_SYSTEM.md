# 🎨 Cerebrix — Sistema de Diseño

> **Ley única:** ningún componente define colores, tiempos, curvas, sombras o espacios propios.
> Todo sale de un token. Si necesitás un valor que no existe, se agrega al token, no al componente.
> Cambiar un token debe repintar el sitio entero.

Este documento es normativo. Es la fuente de verdad de `src/design/`.

Define **los valores**. Dónde vive cada regla — capas globales, componentes compartidos y estilo propio de un juego — está en [`STYLING.md`](./STYLING.md).

---

## 1. Principios

Cerebrix son **juegos de concentración**. El diseño trabaja para la atención, no contra ella.

| # | Principio | Consecuencia práctica |
|---|-----------|----------------------|
| 1 | **El tablero es el protagonista** | La UI que lo rodea es neutra. El color saturado se reserva para el estado del juego. |
| 2 | **Un solo acento fuerte** | Violeta eléctrico. Todo lo demás es neutro o semántico. Máximo **2 colores saturados visibles a la vez** en el área de juego. |
| 3 | **Movimiento que informa** | Cada animación responde a "¿qué cambió y por qué?". Nada se mueve por decoración durante la partida. |
| 4 | **Móvil primero, de verdad** | Se diseña a 360px y se expande. El pulgar es el cursor. |
| 5 | **60fps o no existe** | Solo se animan `transform` y `opacity`. Sin excepciones en el área de juego. |
| 6 | **Neobrutalismo suave** | Formas cúbicas, bordes definidos, sombras sólidas desplazadas — pero con radios amables y contraste controlado. Ni plano ni glassmorphism. |

---

## 2. Color

### 2.1 Paleta cruda (no usar directamente en componentes)

```css
/* src/design/tokens/palette.css — capa 1: valores crudos */
:root {
  /* Neutros — gris azulado, base de toda la UI */
  --raw-slate-50:  #F7F8FA;
  --raw-slate-100: #EDEFF3;
  --raw-slate-200: #DDE1E9;
  --raw-slate-300: #C3C9D6;
  --raw-slate-400: #9AA3B5;
  --raw-slate-500: #6E7891;
  --raw-slate-600: #4E566C;
  --raw-slate-700: #363D4F;
  --raw-slate-800: #232838;
  --raw-slate-900: #171B27;
  --raw-slate-950: #0E1119;

  /* Acento primario — violeta eléctrico */
  --raw-violet-300: #C4B5FD;
  --raw-violet-400: #A78BFA;
  --raw-violet-500: #8B5CF6;
  --raw-violet-600: #6C4CF1;   /* ← el color de la marca */
  --raw-violet-700: #5533D4;
  --raw-violet-900: #2E1B6B;

  /* Acento secundario — ámbar. SOLO logros, rachas y récords. */
  --raw-amber-400: #FFC24D;
  --raw-amber-500: #FFB020;
  --raw-amber-600: #E08C00;

  /* Semánticos */
  --raw-green-500:  #2FBF71;
  --raw-green-600:  #1E9E59;
  --raw-red-500:    #F0426A;
  --raw-red-600:    #D42450;
  --raw-blue-500:   #3EA6FF;
  --raw-blue-600:   #1E86E0;
}
```

### 2.2 Tokens semánticos (**esto** es lo que usan los componentes)

```css
/* src/design/tokens/theme.css — capa 2: intención */
:root,
[data-theme="dark"] {
  /* Superficies */
  --c-bg:            var(--raw-slate-950);
  --c-surface:       var(--raw-slate-900);
  --c-surface-raised: var(--raw-slate-800);
  --c-surface-sunken: #0A0C12;

  /* Texto */
  --c-text:          var(--raw-slate-50);
  --c-text-muted:    var(--raw-slate-400);
  --c-text-subtle:   var(--raw-slate-500);
  --c-text-on-accent: #FFFFFF;

  /* Bordes */
  --c-border:        var(--raw-slate-700);
  --c-border-strong: var(--raw-slate-600);
  --c-border-hairline: var(--raw-slate-800);

  /* Acento */
  --c-accent:        var(--raw-violet-500);
  --c-accent-hover:  var(--raw-violet-400);
  --c-accent-press:  var(--raw-violet-600);
  --c-accent-soft:   color-mix(in oklab, var(--raw-violet-500) 18%, transparent);
  --c-accent-ring:   color-mix(in oklab, var(--raw-violet-400) 55%, transparent);

  /* Highlight (rachas, récords, logros) */
  --c-gold:          var(--raw-amber-400);
  --c-gold-soft:     color-mix(in oklab, var(--raw-amber-400) 16%, transparent);

  /* Semánticos */
  --c-success:       var(--raw-green-500);
  --c-success-soft:  color-mix(in oklab, var(--raw-green-500) 16%, transparent);
  --c-danger:        var(--raw-red-500);
  --c-danger-soft:   color-mix(in oklab, var(--raw-red-500) 16%, transparent);
  --c-info:          var(--raw-blue-500);
  --c-info-soft:     color-mix(in oklab, var(--raw-blue-500) 16%, transparent);

  /* Celdas de tablero — usados por todos los juegos */
  --c-cell:          var(--raw-slate-800);
  --c-cell-hover:    var(--raw-slate-700);
  --c-cell-active:   var(--c-accent-soft);
  --c-cell-fixed:    var(--raw-slate-900);   /* pistas/inmutables */
  --c-cell-peer:     color-mix(in oklab, var(--raw-violet-500) 8%, transparent);
  --c-cell-error:    var(--c-danger-soft);
  --c-cell-hint:     var(--c-info-soft);

  /* Sombra sólida del neobrutalismo */
  --c-shadow:        #000000;
}

[data-theme="light"] {
  --c-bg:            var(--raw-slate-50);
  --c-surface:       #FFFFFF;
  --c-surface-raised: #FFFFFF;
  --c-surface-sunken: var(--raw-slate-100);

  --c-text:          var(--raw-slate-900);
  --c-text-muted:    var(--raw-slate-500);
  --c-text-subtle:   var(--raw-slate-400);
  --c-text-on-accent: #FFFFFF;

  --c-border:        var(--raw-slate-300);
  --c-border-strong: var(--raw-slate-400);
  --c-border-hairline: var(--raw-slate-200);

  --c-accent:        var(--raw-violet-600);
  --c-accent-hover:  var(--raw-violet-500);
  --c-accent-press:  var(--raw-violet-700);
  --c-accent-soft:   color-mix(in oklab, var(--raw-violet-600) 12%, transparent);
  --c-accent-ring:   color-mix(in oklab, var(--raw-violet-600) 45%, transparent);

  --c-gold:          var(--raw-amber-600);
  --c-gold-soft:     color-mix(in oklab, var(--raw-amber-500) 20%, transparent);

  --c-success:       var(--raw-green-600);
  --c-danger:        var(--raw-red-600);
  --c-info:          var(--raw-blue-600);

  --c-cell:          #FFFFFF;
  --c-cell-hover:    var(--raw-slate-100);
  --c-cell-active:   var(--c-accent-soft);
  --c-cell-fixed:    var(--raw-slate-100);
  --c-cell-peer:     color-mix(in oklab, var(--raw-violet-600) 7%, transparent);

  --c-shadow:        var(--raw-slate-900);
}
```

### 2.3 Reglas de color

- **Nunca** un hex literal fuera de `palette.css`.
- **Nunca** `--raw-*` dentro de un componente. Solo `--c-*`.
- El tema se conmuta con `[data-theme]` en `<html>`. Default: `dark`. Se respeta `prefers-color-scheme` solo en el primer arranque, después manda la preferencia guardada.
- Contraste mínimo **AA (4.5:1)** para texto, **3:1** para bordes de celda y estados. Verificar cada par nuevo.
- El color **nunca es el único portador de información**: error = color + icono + shake; celda fija = color + peso tipográfico.

---

## 3. Tipografía

```css
:root {
  /* Familias */
  --font-ui:   "Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-num:  "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;

  /* Escala — base 16px, ratio 1.25 (major third) */
  --fs-2xs: 0.694rem;   /* 11.1px — badges diminutos */
  --fs-xs:  0.8rem;     /* 12.8px — labels, captions */
  --fs-sm:  0.875rem;   /* 14px   — texto secundario */
  --fs-md:  1rem;       /* 16px   — base */
  --fs-lg:  1.25rem;    /* 20px   — subtítulos */
  --fs-xl:  1.563rem;   /* 25px   — títulos de sección */
  --fs-2xl: 1.953rem;   /* 31px   — título de juego */
  --fs-3xl: 2.441rem;   /* 39px   — hero */

  /* Pesos */
  --fw-normal: 400;
  --fw-medium: 500;
  --fw-bold:   700;
  --fw-black:  800;

  /* Interlineado */
  --lh-tight: 1.15;
  --lh-snug:  1.35;
  --lh-body:  1.6;

  /* Tracking */
  --ls-tight: -0.02em;
  --ls-normal: 0;
  --ls-wide:  0.06em;   /* labels en mayúscula */
}
```

**Reglas**

- Los números del juego (celdas, timer, contadores) **siempre** `--font-num` con `font-variant-numeric: tabular-nums`. El timer no debe "bailar" al cambiar de dígito.
- Títulos: `--fw-black` + `--ls-tight`.
- Labels de UI en mayúscula: `--fs-xs` + `--fw-bold` + `--ls-wide`.
- **Fuentes self-hosted**, variable font, subset latin, `font-display: swap`, con `<link rel="preload">` solo para el peso de UI. Nada de Google Fonts en runtime (bloquea el render en 3G).
- El tamaño de la cifra dentro de la celda escala con la celda, no con la fuente base: `font-size: clamp(1rem, calc(var(--cell-size) * 0.52), 2rem)`.

---

## 4. Espaciado, radios, bordes y sombras

```css
:root {
  /* Espaciado — base 4px */
  --sp-0:  0;
  --sp-1:  0.25rem;   /* 4  */
  --sp-2:  0.5rem;    /* 8  */
  --sp-3:  0.75rem;   /* 12 */
  --sp-4:  1rem;      /* 16 */
  --sp-5:  1.5rem;    /* 24 */
  --sp-6:  2rem;      /* 32 */
  --sp-7:  3rem;      /* 48 */
  --sp-8:  4rem;      /* 64 */

  /* Radios — cúbico suave */
  --r-xs:   4px;
  --r-sm:   6px;
  --r-md:   10px;
  --r-lg:   14px;
  --r-xl:   20px;
  --r-full: 999px;

  /* Bordes */
  --bw-hair: 1px;
  --bw-base: 2px;
  --bw-thick: 3px;

  /* Sombras — sólidas y desplazadas (neobrutalismo suave) */
  --sh-sm:  2px 2px 0 0 var(--c-shadow);
  --sh-md:  4px 4px 0 0 var(--c-shadow);
  --sh-lg:  6px 6px 0 0 var(--c-shadow);
  /* Elevación difusa — solo modales y menús flotantes */
  --sh-pop: 0 12px 32px -8px rgb(0 0 0 / 0.45);

  /* Foco — accesibilidad, idéntico en toda la app */
  --ring: 0 0 0 3px var(--c-accent-ring);
  --ring-offset: 0 0 0 2px var(--c-bg), 0 0 0 5px var(--c-accent-ring);
}
```

**Regla del neobrutalismo:** un elemento interactivo elevado tiene borde `--bw-base` + sombra sólida. Al presionarse, la sombra colapsa y el elemento se traslada la misma distancia — se "hunde" sin cambiar de tamaño.

```css
.btn:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 0 var(--c-shadow);
}
```

---

## 5. Movimiento — el corazón del feel

### 5.1 Tokens de motion

```css
:root {
  /* Duraciones */
  --d-instant: 80ms;    /* feedback táctil, cambio de color */
  --d-fast:    140ms;   /* hover, focus, press */
  --d-base:    220ms;   /* aparición de elementos, tooltips */
  --d-slow:    360ms;   /* transición de vista, modal */
  --d-slower:  600ms;   /* celebraciones, cascadas */

  /* Curvas */
  --e-out:     cubic-bezier(0.22, 1, 0.36, 1);      /* salida suave — el default */
  --e-in-out:  cubic-bezier(0.65, 0, 0.35, 1);      /* movimientos simétricos */
  --e-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);   /* rebote sutil — confirmaciones */
  --e-snap:    cubic-bezier(0.4, 0, 0.2, 1);        /* material-ish, para press */

  /* Delays de cascada (stagger) */
  --stagger-step: 22ms;
  --stagger-max:  260ms;   /* techo: nunca esperar más que esto */
}
```

### 5.2 Reglas de rendimiento (no negociables)

1. Solo se anima **`transform`** y **`opacity`**. Prohibido animar `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` con blur, o `filter` sobre áreas grandes en móvil.
2. `will-change` se aplica **al empezar** la interacción y se quita al terminar. Nunca permanente — cada `will-change` es una capa de GPU y el móvil tiene memoria de video limitada.
3. Un tablero de Buscaminas experto tiene ~480 celdas: **jamás** una animación simultánea en todas. Las cascadas se hacen por **onda con delay calculado desde el origen**, y el delay se topea en `--stagger-max`.
4. Las celebraciones (confeti, partículas) se dibujan en un **`<canvas>` desmontable**, nunca con cientos de nodos DOM.
5. Presupuesto: **≤ 8ms de trabajo de main thread por frame** en un dispositivo de gama media. Se verifica con throttling 4× en DevTools.

### 5.3 Catálogo de animaciones estándar

| Nombre | Cuándo | Definición | Duración / curva |
|--------|--------|-----------|------------------|
| `press` | Cualquier botón/celda al tocarse | `scale(0.96)` | `--d-instant` / `--e-snap` |
| `lift` | Hover en desktop | `translateY(-2px)` + sombra a `--sh-lg` | `--d-fast` / `--e-out` |
| `pop-in` | Cifra que entra en una celda | `scale(0.6) → 1` + `opacity 0 → 1` | `--d-fast` / `--e-spring` |
| `shake` | Jugada inválida | `translateX: 0,-4,4,-3,3,0` | `--d-base` / `--e-in-out` |
| `pulse-soft` | Celda con pista activa | `opacity .55 ↔ 1`, infinito | 1.6s / `--e-in-out` |
| `reveal-wave` | Cascada al despejar zona | `scale(.4)→1` + `opacity`, delay por distancia | `--d-base` / `--e-out` |
| `flip` | Carta / celda que se da vuelta | `rotateY(0→180deg)`, `backface-visibility: hidden` | `--d-base` / `--e-in-out` |
| `slide-up` | Entrada de panel o modal | `translateY(16px)→0` + `opacity` | `--d-slow` / `--e-out` |
| `view-in` | Cambio de ruta (home ↔ juego) | `opacity` + `scale(0.985)→1` | `--d-slow` / `--e-out` |
| `win-burst` | Victoria | cascada por filas + canvas de partículas | `--d-slower` / `--e-spring` |
| `count-up` | Números de estadísticas | interpolación numérica con `rAF` | 700ms / `--e-out` |

Todas viven en `src/design/animations.css` como `@keyframes` + utilidades `.anim-*`. **Ningún juego define keyframes propios**; si necesita uno nuevo, se agrega al catálogo.

### 5.4 Carga inicial de la web (secuencia de entrada)

El usuario pidió explícitamente que la web "se cargue animada". La secuencia, al montar la Home:

```
t=0ms     Fondo pintado (bg token) — sin flash blanco (theme aplicado antes de React vía script inline en <head>)
t=0ms     Logo Cerebrix: SVG con trazo animado (stroke-dashoffset) + pop-in    → 420ms
t=120ms   Header/título: slide-up                                              → 360ms
t=200ms   Tarjetas de juego: cascada, delay = índice × --stagger-step          → 220ms c/u
t=380ms   Barra de estadísticas: fade + count-up de los números
```

- La cascada se implementa con `animation-delay: calc(var(--i) * var(--stagger-step))`, pasando `--i` como style inline en cada tarjeta.
- Se corre **una sola vez por sesión**. Al volver a Home desde un juego se usa `view-in` (más corta), no la secuencia completa. Flag en `sessionStorage`.
- El skeleton de carga usa `shimmer` sobre `--c-surface-raised`; nunca un spinner centrado a pantalla completa.

### 5.5 Accesibilidad del movimiento

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Además, un toggle **"Reducir animaciones"** en Ajustes que setea `[data-motion="reduced"]` en `<html>` y persiste. El estado final de toda animación debe ser correcto aunque la animación no corra nunca.

---

## 6. Sprites e ilustración

**Decisión: SVG inline en código, animado con CSS.** Sin spritesheets, sin librerías de animación, sin descargas externas.

### 6.1 Por qué

- Nítidos en cualquier densidad de pantalla, sin `@2x`.
- Heredan el tema automáticamente usando `currentColor` y tokens.
- Pesan cientos de bytes y viajan dentro del chunk del juego que los usa (lazy load gratis).
- Animables con CSS puro (`transform`, `stroke-dashoffset`, `opacity`).

### 6.2 Convenciones

```
src/design/sprites/          → compartidos por toda la app (trofeo, racha, reloj, logo)
src/games/<juego>/sprites/   → propios del juego (mina, bandera, palo de carta)
```

- Cada sprite es un componente React que acepta `{ size?, className?, state? }`.
- `viewBox="0 0 24 24"` para iconos de UI, `viewBox="0 0 32 32"` para piezas de juego.
- Colores: `currentColor` por defecto; para multicolor, `var(--c-*)` directo en el `fill`.
- Sin `<style>` dentro del SVG: las animaciones se aplican desde la hoja del componente por clase.
- Optimizados con SVGO antes de commitear (sin metadata de editor, sin `id` innecesarios).

### 6.3 Sprites animados requeridos (mínimo v1)

| Sprite | Ubicación | Animación |
|--------|-----------|-----------|
| `LogoCerebrix` | design | Trazo dibujándose al cargar, luego respiración lenta muy sutil |
| `Trophy` | design | `pop-in` + brillo que barre en diagonal al desbloquear |
| `Streak` (llama) | design | Ondulación infinita de 2s, se detiene si racha = 0 |
| `Clock` | design | Aguja que avanza por segundo con `steps()` |
| `Mine` | minesweeper | Púas que se expanden + `shake` al detonar |
| `Flag` | minesweeper | Asta fija, tela que ondea al plantarla |
| `CardSuit` ×4 | solitaire | `flip` al voltear la carta |
| `PencilMark` | sudoku | Fade-in de las anotaciones al alternar modo lápiz |

### 6.4 Estados de sprite

Cada sprite expone estados por atributo, nunca por componentes duplicados:

```jsx
<Mine state="idle" />       // reposo
<Mine state="revealed" />   // descubierta
<Mine state="exploded" />   // la que perdió la partida
```

---

## 7. Responsive y táctil

### 7.1 Breakpoints

```css
/* Mobile-first. Se diseña a 360px y se agrega desde ahí. */
--bp-sm:  480px;   /* móvil grande */
--bp-md:  768px;   /* tablet vertical */
--bp-lg:  1024px;  /* tablet horizontal / laptop */
--bp-xl:  1280px;  /* desktop */
```

> Los custom properties no funcionan en `@media`. Los breakpoints se declaran también como constantes en `src/design/breakpoints.ts` y, en CSS, se escriben literales acompañados del comentario del token. Una sola fuente de verdad documentada aquí.

### 7.2 Layout del shell

| Zona | Móvil | Desktop |
|------|-------|---------|
| Header | Fijo arriba, 56px, timer + dificultad | 64px, agrega título del juego |
| Tablero | Centrado, ancho = `min(100vw - 2*--sp-4, 100dvh - 168px)` | Máx 560px, centrado |
| Acciones | **Barra fija abajo**, dentro del alcance del pulgar, con `env(safe-area-inset-bottom)` | Fila bajo el tablero |
| Teclado numérico (Sudoku) | Fila fija sobre las acciones, botones de 48px | Lateral derecho o teclado físico |

### 7.3 Reglas táctiles

- Área de toque mínima **44×44 px** (WCAG 2.5.5). Si la celda visual es menor, se agranda con un pseudo-elemento, no con padding que deforme el grid.
- `touch-action: manipulation` en todo lo interactivo — elimina el retardo de 300ms.
- `user-select: none` en el tablero — evita la selección de texto al arrastrar.
- Prohibido el hover como único canal de información: **todo hover tiene equivalente táctil** (`:active`, long-press, o estado explícito). Envolver los efectos de hover en `@media (hover: hover) and (pointer: fine)`.
- Long-press = 400ms, con feedback visual progresivo (anillo que se llena) y `navigator.vibrate(12)` donde exista.
- El tablero nunca provoca scroll horizontal. `overscroll-behavior: contain` en el contenedor de juego para evitar el pull-to-refresh accidental.
- Alturas con `dvh`, nunca `vh` — la barra de URL móvil rompe `vh`.

### 7.4 Dimensionado del tablero

Una sola variable manda el tamaño de celda, y todo lo demás se deriva:

```css
.board {
  --cols: 9;
  --board-max: min(100vw - (2 * var(--sp-4)), 100dvh - 168px, 560px);
  --cell-size: calc((var(--board-max) - (var(--cols) - 1) * var(--bw-hair)) / var(--cols));
  width: var(--board-max);
  aspect-ratio: 1;
}
```

---

## 8. Rendimiento y lazy loading

| Qué | Cómo |
|-----|------|
| Código de cada juego | `React.lazy(() => import('@games/sudoku'))` en el registro. El juego **nunca** está en el bundle inicial. |
| Prefetch inteligente | Al hacer hover (desktop) o `pointerdown` (móvil) sobre una tarjeta, se dispara el `import()`. Cuando el usuario suelta, ya está cargado. |
| Puzzles pregenerados | Un JSON por dificultad, importado dinámicamente solo al elegir esa dificultad. |
| Generador de Sudoku | En un **Web Worker**, cargado bajo demanda. El backtracking nunca bloquea el hilo de UI. |
| Sprites | Viajan en el chunk del juego. Los compartidos van en el bundle base (son pocos KB). |
| Fuentes | Self-hosted, subset, `preload` solo del peso principal. |
| Imágenes (si aparecen) | `loading="lazy"` + `decoding="async"` + `width`/`height` explícitos para reservar espacio. |
| Estadísticas / logros | Vistas lazy — no forman parte del bundle inicial. |

**Presupuesto de bundle inicial: ≤ 120 KB gzip** (shell + design system + home). Cada juego, ≤ 60 KB gzip aparte.

**Objetivos Lighthouse móvil (throttling 4×):** LCP < 2.0s · CLS < 0.05 · INP < 200ms · Performance ≥ 90.

---

## 9. Componentes base (`src/design/components/`)

Se construyen **una sola vez** y todos los juegos los consumen. Ninguno conoce reglas de un juego específico.

| Componente | API resumida | Notas |
|------------|-------------|-------|
| `<Button>` | `variant: primary\|ghost\|danger`, `size: sm\|md\|lg`, `icon`, `loading` | Sombra sólida + colapso al presionar |
| `<IconButton>` | `label` (obligatorio, a11y), `icon` | 44px mínimo siempre |
| `<Cell>` | `state: empty\|filled\|fixed\|selected\|peer\|error\|hint`, `onActivate` | **Genérico.** Sudoku y Buscaminas usan el mismo. `React.memo` obligatorio. |
| `<Grid>` | `cols`, `rows`, `gap`, `blockLines?` | Dibuja las líneas de bloque 3×3 con `box-shadow`, no con nodos extra |
| `<Timer>` | `running`, `elapsedMs`, `onTick?` | Tabular-nums. El tick vive fuera de React (`rAF`), no re-renderiza el árbol |
| `<Badge>` | `tone: neutral\|accent\|gold\|success\|danger` | |
| `<DifficultyPicker>` | `value: 1..5`, `onChange`, `available: number[]` | Idéntico en todos los juegos |
| `<Modal>` | `open`, `onClose`, `title` | Focus trap, `Esc`, click fuera, `slide-up` |
| `<Toast>` | `tone`, `duration` | Anclado arriba en móvil, abajo-derecha en desktop |
| `<Skeleton>` | `w`, `h`, `radius` | Shimmer, sin spinners |
| `<StatTile>` | `label`, `value`, `icon`, `trend?` | Usa `count-up` al entrar |
| `<EmptyState>` | `sprite`, `title`, `action` | |

---

## 10. Accesibilidad (mínimos de v1)

- Todo el tablero navegable por teclado: flechas para moverse, números para escribir, `Espacio` para alternar, `Esc` para deseleccionar.
- Foco visible **siempre** con `--ring`. Prohibido `outline: none` sin reemplazo.
- `aria-live="polite"` para el estado del juego (victoria, error, pista usada).
- Cada celda con `role="gridcell"` y `aria-label` descriptivo ("fila 3, columna 5, vacía").
- Contraste AA verificado en ambos temas.
- Un solo `<h1>` por vista; jerarquía de headings coherente.

---

## 11. Checklist antes de mergear cualquier UI

- [ ] Cero hex literales fuera de `palette.css`
- [ ] Cero `--raw-*` en componentes
- [ ] Cero duraciones/curvas hardcodeadas
- [ ] Solo se anima `transform` / `opacity`
- [ ] Probado a 360px de ancho, sin scroll horizontal
- [ ] Áreas de toque ≥ 44px
- [ ] Cada hover tiene equivalente táctil
- [ ] Funciona y se ve correcto con `prefers-reduced-motion: reduce`
- [ ] Navegable por teclado, con foco visible
- [ ] Se ve bien en tema claro **y** oscuro
- [ ] Ningún chunk de juego entró al bundle inicial
