# 🧵 Cerebrix — Arquitectura de Estilos

> **Ley:** todo estilo pertenece a **una** capa, y esa capa es la más baja donde el estilo tenga sentido.
> Si dudás entre "global" y "del juego", es global.
> Complemento de [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (los valores) — este documento define **dónde vive cada regla**.

---

## 1. Las cuatro capas

El CSS se carga en este orden exacto. Cada capa solo puede depender de las anteriores.

```
┌─ Capa 4 ── ESTILO DE JUEGO ──────────────────────────────────┐
│  src/games/<id>/view/*.module.css                            │
│  Solo lo que es intrínseco a ESE juego y de nadie más.       │
│  Ej: líneas de bloque 3×3 del Sudoku, ondear de la bandera.  │
├─ Capa 3 ── COMPONENTES ──────────────────────────────────────┤
│  src/design/components/<Comp>/<Comp>.module.css              │
│  El aspecto de Button, Cell, Grid, Modal… Consume tokens.    │
├─ Capa 2 ── GLOBAL BASE ──────────────────────────────────────┤
│  src/design/global/  → reset · elements · a11y · utilities   │
│  Reset, tipografía base, foco, scrollbars, motion reducido.  │
├─ Capa 1 ── TOKENS ───────────────────────────────────────────┤
│  src/design/tokens/  → palette · theme · space · motion      │
│  SOLO custom properties. Cero selectores con estilo real.    │
└──────────────────────────────────────────────────────────────┘
```

Se declara explícitamente con `@layer` para que la cascada no dependa del orden de import:

```css
/* src/design/index.css — el único punto de entrada global */
@layer tokens, base, components, game, overrides;

@import './tokens/palette.css'   layer(tokens);
@import './tokens/theme.css'     layer(tokens);
@import './tokens/space.css'     layer(tokens);
@import './tokens/motion.css'    layer(tokens);

@import './global/reset.css'     layer(base);
@import './global/elements.css'  layer(base);
@import './global/a11y.css'      layer(base);
@import './global/utilities.css' layer(base);

@import './animations.css'       layer(base);
```

Los CSS Modules de componentes se envuelven en `@layer components`, y los de juego en `@layer game`. Consecuencia práctica: **un juego siempre puede sobrescribir un componente sin `!important` ni guerras de especificidad**, y sigue siendo evidente en el diff que lo está haciendo.

> `overrides` queda declarada y vacía a propósito. Es el escape hatch de última instancia; si algún día algo aterriza ahí, debe llevar un comentario con el motivo.

---

## 2. Qué va en cada capa

### Capa 1 — Tokens (`src/design/tokens/`)

✅ **Solo** declaraciones de custom properties.
❌ Prohibido cualquier selector que pinte algo.

| Archivo | Contenido |
|---------|-----------|
| `palette.css` | Valores crudos `--raw-*`. El único lugar del repo con hex literales. |
| `theme.css` | Tokens semánticos `--c-*` para `[data-theme="dark"]` y `[data-theme="light"]`. |
| `space.css` | `--sp-*`, `--r-*`, `--bw-*`, `--sh-*`, `--ring`. |
| `motion.css` | `--d-*`, `--e-*`, `--stagger-*`. |
| `type.css` | `--font-*`, `--fs-*`, `--fw-*`, `--lh-*`, `--ls-*`. |

### Capa 2 — Global base (`src/design/global/`)

Lo que aplica a **toda** la app sin que nadie tenga que pedirlo.

| Archivo | Contenido |
|---------|-----------|
| `reset.css` | `box-sizing`, márgenes en cero, `img`/`svg` en bloque, `dvh`, `overscroll-behavior`, `-webkit-tap-highlight-color: transparent`. |
| `elements.css` | `html`/`body` con tokens, tipografía base, `h1..h6`, `p`, `a`, `button`, `input`, selección de texto, scrollbars. |
| `a11y.css` | `:focus-visible` con `--ring`, `.sr-only`, `prefers-reduced-motion`, `[data-motion="reduced"]`. |
| `utilities.css` | **Lista cerrada** (§4). Nada de un framework de utilidades acá. |
| `animations.css` | Los `@keyframes` del catálogo y las clases `.anim-*`. |

### Capa 3 — Componentes (`src/design/components/`)

Un CSS Module por componente, junto a su `.tsx`:

```
src/design/components/Button/
├── Button.tsx
├── Button.module.css
└── index.ts
```

✅ Consume tokens, define variantes vía `data-*`.
❌ No conoce ningún juego. No usa `--raw-*`. No usa valores mágicos.

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 44px;                      /* táctil */
  padding: var(--sp-2) var(--sp-4);
  border: var(--bw-base) solid var(--c-border-strong);
  border-radius: var(--r-md);
  background: var(--c-surface-raised);
  color: var(--c-text);
  font: var(--fw-bold) var(--fs-sm) / 1 var(--font-ui);
  box-shadow: var(--sh-md);
  transition: transform var(--d-fast) var(--e-out),
              box-shadow var(--d-fast) var(--e-out),
              background-color var(--d-fast) var(--e-out);
}

.button[data-variant='primary'] {
  background: var(--c-accent);
  border-color: var(--c-accent-press);
  color: var(--c-text-on-accent);
}

/* El hover SOLO donde hay un puntero real */
@media (hover: hover) and (pointer: fine) {
  .button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sh-lg);
    background: var(--c-accent-hover);
  }
}

.button:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 0 var(--c-shadow);
}
```

**Variantes con `data-*`, no con clases concatenadas.** Se lee mejor en DevTools, evita `clsx` en el 90% de los casos y hace triviales los selectores de estado.

### Capa 4 — Estilo de juego (`src/games/<id>/view/`)

El único CSS que un juego puede escribir es el que **ningún otro juego podría reusar**.

✅ Legítimo:
- Las líneas gruesas que separan las cajas 3×3 del Sudoku.
- El ondear de la tela de la bandera en Buscaminas.
- El abanico de cartas del Solitario.

❌ No legítimo (va a Capa 2 o 3):
- Un botón con otro color → variante de `<Button>`.
- Un espaciado distinto → token de espaciado.
- Una animación de entrada → catálogo de `animations.css`.
- "Este juego necesita las celdas más redondeadas" → prop de `<Cell>`.

---

## 3. El árbol de decisión

Antes de escribir una sola regla CSS:

```
¿Es un valor (color, tiempo, espacio, radio)?
   └─ SÍ → ¿existe el token?
             ├─ SÍ → usalo
             └─ NO → agregalo a tokens/. NUNCA lo hardcodees.

¿Es el aspecto de un elemento de UI (botón, celda, badge, modal)?
   └─ SÍ → ¿existe el componente en /design?
             ├─ SÍ → ¿le falta una variante?
             │        ├─ SÍ → agregá la variante AL COMPONENTE
             │        └─ NO → usalo tal cual
             └─ NO → creá el componente en /design (no en el juego)

¿Lo necesitaría otro juego alguna vez?
   ├─ SÍ o "quizás" → /design
   └─ NO, es de la naturaleza de ESTE juego → games/<id>/view/*.module.css

¿Es un valor que cambia en runtime por celda/índice?
   └─ SÍ → custom property inline (§5). Es dato, no estilo.
```

**Regla del pulgar:** si dudás, va a `/design`. Es más barato mover algo específico hacia arriba que desenredar tres juegos que copiaron el mismo CSS.

---

## 4. Utilidades globales — lista cerrada

No usamos un framework de utilidades. Existen **estas y solo estas**, en `utilities.css`. Agregar una requiere justificarla en el PR:

| Clase | Para qué |
|-------|----------|
| `.sr-only` | Texto solo para lectores de pantalla |
| `.stack` | Columna flex con `gap: var(--gap, var(--sp-4))` |
| `.row` | Fila flex con `gap` y `align-items: center` |
| `.center` | Centrado en ambos ejes |
| `.truncate` | Elipsis de una línea |
| `.tabular` | `font-variant-numeric: tabular-nums` |
| `.no-select` | `user-select: none` (tableros) |
| `.anim-*` | Las del catálogo de animaciones |

Todo lo demás se resuelve con un CSS Module.

---

## 5. Estilos inline: la regla y su única excepción

### ❌ Prohibido

```jsx
<div style={{ padding: 16, background: '#232838', borderRadius: 10 }}>
<button style={{ transition: 'all .2s' }}>
```

Rompe el theming, esquiva los tokens, es invisible para stylelint y no se puede sobrescribir sin `!important`.

**Enforcado por lint:** `react/forbid-dom-props` marca `style` como error.

### ✅ La única excepción: custom properties como canal de datos

Un valor que **solo se conoce en runtime y varía por elemento** no puede vivir en una hoja estática. Se pasa como custom property, y el CSS Module decide qué hacer con ella. Eso no es estilo inline: es **dato**.

```jsx
// ✅ Correcto — el índice alimenta la cascada, el CSS define la animación
{games.map((game, i) => (
  <GameCard key={game.id} style={{ '--i': i }} />
))}
```
```css
.card { animation: pop-in var(--d-base) var(--e-out) backwards;
        animation-delay: min(calc(var(--i) * var(--stagger-step)), var(--stagger-max)); }
```

```jsx
// ✅ Correcto — el tamaño del tablero depende de la dificultad
<div className={s.board} style={{ '--cols': cols, '--rows': rows }} />
```

**Condiciones para que la excepción aplique:**

1. El valor es **solo** una custom property (`--algo`). Nunca una propiedad CSS real.
2. El nombre está declarado con `@property` en `tokens/`, o documentado en el `.module.css` que la consume.
3. La regla que la usa vive en un CSS Module, no inline.

El lint permite `style` únicamente cuando todas las claves empiezan con `--`.

### ⚠️ Y una excepción a la excepción

Si la custom property se recalcula **en cada frame** (arrastre, seguimiento del dedo), no pasa por React: se escribe con `element.style.setProperty('--x', …)` dentro de un `requestAnimationFrame`. Un `setState` por frame vuelve a renderizar el árbol y mata los 60fps.

---

## 6. Convenciones de CSS Modules

```
✅ Button.module.css   (junto al .tsx)          ❌ styles/button.css
✅ .cell, .cellInner, .isSelected               ❌ .Cell, .cell-inner, .cell__inner--selected
✅ import s from './Board.module.css'           ❌ import styles from ...
✅ <div className={s.board} data-state="won">   ❌ className={`board ${won ? 'won' : ''}`}
```

- **camelCase** en los nombres de clase (acceso directo `s.cellInner`, sin corchetes).
- Un archivo por componente, al lado del `.tsx`. Nunca una carpeta `styles/` central.
- Estados con `data-*`, no con clases modificadoras.
- `:global()` está **prohibido** salvo para integrar librerías externas, y con comentario.
- Anidamiento máximo: **2 niveles**. Más que eso, es un componente nuevo.
- Orden dentro del bloque: layout → box → tipografía → visual → transición.

---

## 7. Cómo un juego personaliza un componente compartido

Tres mecanismos, en orden de preferencia:

**1. Prop de variante** — si el caso es reusable, se agrega al componente.
```jsx
<Cell variant="fixed" size="sm" />
```

**2. Custom properties de instancia** — el componente expone "perillas" documentadas.
```css
/* Cell.module.css — API pública del componente */
.cell {
  background: var(--cell-bg, var(--c-cell));
  border-radius: var(--cell-radius, var(--r-sm));
}
```
```css
/* games/minesweeper/view/Board.module.css */
.board { --cell-radius: var(--r-xs); }   /* Buscaminas usa celdas más cuadradas */
```

**3. Sobrescritura por capa** — último recurso, solo para lo genuinamente único.
```css
/* games/sudoku/view/Board.module.css — @layer game gana sobre @layer components */
.board .cell[data-block-edge='right'] {
  box-shadow: inset -2px 0 0 0 var(--c-border-strong);   /* línea de caja 3×3 */
}
```

Si un juego llega al mecanismo 3 más de dos o tres veces, **el componente compartido está mal diseñado**. Se refactoriza el componente, no se acumulan overrides.

---

## 8. Enforcement automático

Ninguna de estas reglas sobrevive tres semanas si depende de la memoria. Todo se verifica en CI:

| Regla | Herramienta |
|-------|-------------|
| Cero hex fuera de `palette.css` | `stylelint` — `color-no-hex` con override para ese archivo |
| Cero `--raw-*` fuera de `theme.css` | `stylelint` — regla `declaration-property-value-disallowed-list` |
| Cero duraciones/curvas hardcodeadas | `stylelint` — patrón sobre `transition` / `animation` |
| Cero `style={}` con propiedades reales | `eslint` — `react/forbid-dom-props` + regla propia que permite claves `--*` |
| Solo `transform`/`opacity` animados | `stylelint` — lista blanca en `transition-property` |
| CSS Modules en camelCase | `stylelint` — `selector-class-pattern` |
| `/design` no importa de `/core` ni `/games` | `eslint-plugin-boundaries` |
| Nada de `!important` | `stylelint` — `declaration-no-important` |

---

## 9. Checklist antes de mergear CSS

- [ ] Cada regla está en la capa más baja donde tiene sentido
- [ ] Cero hex, cero `--raw-*`, cero milisegundos, cero curvas literales
- [ ] Cero `style={}` que no sea exclusivamente custom properties
- [ ] Cero `!important`, cero `:global()` sin comentario
- [ ] El hover está dentro de `@media (hover: hover)`
- [ ] Estados con `data-*`, no con clases concatenadas
- [ ] Si es CSS de juego: ningún otro juego podría necesitarlo
- [ ] Se ve correcto en tema claro y oscuro, y a 360px
