# 🔌 Cerebrix — Contrato de Juego

> La pieza que hace que agregar el juego nº 7 tome un día y no una semana.
> Si un juego necesita que el shell cambie, **el contrato está mal** — se arregla el contrato, no se parcha el shell.

---

## 1. La idea en una frase

Un juego es un **módulo autocontenido** que expone tres cosas: metadata, un motor puro y una vista.
El shell conoce el contrato. **Nunca** conoce el juego.

```
┌─────────────────────── /core ───────────────────────┐
│  registry  →  { id, meta, load: () => import(...) } │
│  shell     →  header · área central · footer        │
│  session   →  timer, autosave, dificultad, victoria │
└──────────────────────────┬──────────────────────────┘
                           │  GameModule (el contrato)
        ┌──────────────────┼──────────────────┐
   /games/sudoku     /games/minesweeper    /games/_dummy
```

---

## 2. Por qué `engine` y `View` están separados

El plan original definía una sola interfaz con `init`, `render`, `validate`, `checkWin`, `serialize`, `deserialize`, `getDifficultyConfig`.

Meter `render` ahí acopla la lógica del juego a React. Separados:

- El engine se testea **sin DOM ni renderer** — tests de milisegundos.
- El engine corre en un **Web Worker** (indispensable para el generador de Sudoku).
- Cambiar de framework, o agregar un frontend nativo, no toca la lógica.
- El estado del juego es **serializable por construcción**, que es justo lo que la persistencia necesita.

Regla dura: **`/games/*/engine/` no importa React, ni CSS, ni `/design`.**

---

## 3. Los tipos

```ts
// src/core/contract.ts

import type { ComponentType } from 'react';

/* ─────────────── Dificultad ─────────────── */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/* ─────────────── Metadata ─────────────── */

export interface GameMeta {
  /** Identificador estable. Va en la URL y en la base de datos: no se cambia nunca. */
  id: string;
  name: string;
  /** Una línea para la tarjeta de Home. */
  tagline: string;
  /** Sprite del juego. Componente, no ruta de archivo. */
  icon: ComponentType<{ size?: number }>;
  /** Solo las dificultades que este juego realmente implementa. */
  difficulties: Difficulty[];
  /** Para filtrar y agrupar en Home. */
  tags: ('lógica' | 'memoria' | 'cálculo' | 'azar' | 'velocidad')[];
  /** Minutos estimados por partida. Se muestra en la tarjeta. */
  estimatedMinutes: [min: number, max: number];
  /** Versión del formato de estado. Se incrementa al cambiar la forma de TState. */
  stateVersion: number;
}

/* ─────────────── Motor (lógica pura) ─────────────── */

/**
 * TState  = estado completo y serializable de la partida.
 * TMove   = acción del jugador (colocar cifra, poner bandera, mover carta...).
 * TConfig = configuración interna que el juego deriva de la dificultad.
 */
export interface GameEngine<TState, TMove, TConfig = unknown> {
  /** Traduce la escala 1–5 a la configuración interna del juego. */
  getDifficultyConfig(difficulty: Difficulty): TConfig;

  /**
   * Crea una partida nueva.
   * `seed` permite partidas reproducibles (puzzle diario, compartir un tablero).
   * Puede ser async: cargar un JSON de puzzles o pedirle uno al worker.
   */
  createInitialState(config: TConfig, seed?: string): TState | Promise<TState>;

  /** ¿Es legal esta jugada en este estado? Nunca muta. */
  validate(state: TState, move: TMove): ValidationResult;

  /**
   * Aplica la jugada. DEBE ser pura: devuelve un estado nuevo, no muta el recibido.
   * El shell asume inmutabilidad para deshacer/rehacer y para el diffing de React.
   */
  applyMove(state: TState, move: TMove): TState;

  /** Estado terminal de la partida. */
  checkStatus(state: TState): GameStatus;

  /** Cuánto falta, de 0 a 1. Alimenta la barra de progreso del shell. */
  getProgress(state: TState): number;

  /** Opcional: sugiere la próxima jugada. Habilita el botón de pista del shell. */
  getHint?(state: TState): Hint | null;

  /** Estado → JSON. Se guarda tal cual. */
  serialize(state: TState): string;

  /** JSON → estado. Recibe la versión con la que se guardó, para poder migrar. */
  deserialize(raw: string, fromVersion: number): TState;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string; cells?: CellRef[] }; // celdas a resaltar en rojo

export type GameStatus =
  { kind: 'playing' } | { kind: 'won'; score?: number } | { kind: 'lost'; reason?: string };

export interface Hint {
  cells: CellRef[];
  message: string;
}

export interface CellRef {
  row: number;
  col: number;
}

/* ─────────────── Vista ─────────────── */

/** Lo que el shell le pasa a la vista del juego. */
export interface GameViewProps<TState, TMove> {
  state: TState;
  /** Único canal de entrada. La vista NUNCA muta el estado por su cuenta. */
  dispatch(move: TMove): void;
  status: GameStatus;
  difficulty: Difficulty;
  /** Para deshabilitar la interacción durante animaciones o al terminar. */
  interactive: boolean;
  /** Pista activa, si el jugador pidió una. */
  hint: Hint | null;
}

/* ─────────────── El módulo completo ─────────────── */

export interface GameModule<TState = unknown, TMove = unknown, TConfig = unknown> {
  meta: GameMeta;
  engine: GameEngine<TState, TMove, TConfig>;
  View: ComponentType<GameViewProps<TState, TMove>>;
  /** Acciones extra en el footer, propias del juego (ej. modo lápiz en Sudoku). */
  actions?: GameAction<TMove>[];
}

export interface GameAction<TMove> {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** Devuelve la jugada a despachar, o null si solo cambia estado local de la vista. */
  toMove?: () => TMove | null;
  /** Si es toggle, el shell dibuja el estado activo. */
  toggle?: boolean;
}
```

---

## 4. El registro

El único punto de `/core` que nombra juegos — y solo por string y función perezosa. Ningún `import` estático.

```ts
// src/core/registry.ts

export interface RegistryEntry {
  id: string;
  /** Metadata liviana para pintar Home sin cargar el juego. */
  preview: Pick<GameMeta, 'id' | 'name' | 'tagline' | 'difficulties' | 'tags' | 'estimatedMinutes'>;
  /** El ícono sí se importa estático: son ~1 kB y Home los necesita ya. */
  icon: ComponentType<{ size?: number }>;
  /** El juego entero, perezoso. Nunca en el bundle inicial. */
  load: () => Promise<{ default: GameModule<any, any, any> }>;
}

export const REGISTRY: RegistryEntry[] = [
  {
    id: 'sudoku',
    preview: {/* ... */},
    icon: SudokuIcon,
    load: () => import('@games/sudoku'),
  },
  // Agregar un juego = agregar una entrada. Nada más en todo /core.
];
```

**Por qué la metadata está duplicada en `preview`:** Home tiene que pintar las tarjetas sin descargar el código de los juegos. Si leyera `meta` del módulo, cargaría los seis juegos al abrir la app y el bundle inicial se iría al demonio. Un test verifica que `preview` coincida con el `meta` real de cada módulo, así la duplicación no se desincroniza.

---

## 5. De quién es cada responsabilidad

| Responsabilidad                           |        Shell (`/core`)         |                 Juego                  |
| ----------------------------------------- | :----------------------------: | :------------------------------------: |
| Timer, pausa, reanudar                    |               ✅               |                   ❌                   |
| Selector de dificultad                    |               ✅               |       Solo `getDifficultyConfig`       |
| Autosave y resumir                        |               ✅               |    Solo `serialize` / `deserialize`    |
| Deshacer / rehacer                        | ✅ (guarda la pila de estados) | ❌ (por eso `applyMove` debe ser puro) |
| Estadísticas y rachas                     |               ✅               |                   ❌                   |
| Botón de pista                            |    ✅ (si existe `getHint`)    |             Solo `getHint`             |
| Modal de victoria / derrota               |               ✅               |  ❌ (solo reporta vía `checkStatus`)   |
| Barra de progreso                         |               ✅               |           Solo `getProgress`           |
| Reglas del juego                          |               ❌               |                   ✅                   |
| Render del tablero                        |               ❌               |   ✅ (con componentes de `/design`)    |
| Interacción propia (long-press, chording) |               ❌               |                   ✅                   |

Si un juego siente que necesita su propio timer o su propio autosave: **es señal de que el contrato está incompleto**. Se extiende el contrato, no se duplica la funcionalidad dentro del juego.

---

## 6. Ciclo de vida de una partida

```
Home
  └─ tap en tarjeta
      ├─ prefetch del chunk ya disparado en pointerdown ⚡
      ├─ ¿hay sesión guardada? ──sí──► engine.deserialize(raw, version)
      │                          └no─► engine.createInitialState(config, seed)
      ├─ el shell monta <View state dispatch status ... />
      │
      └─ bucle de juego
           usuario interactúa
             → View llama dispatch(move)
             → shell: engine.validate(state, move)
                 ├─ ok: false → shake + resaltar celdas + no cambia el estado
                 └─ ok: true  → state = engine.applyMove(state, move)
                                push a la pila de deshacer
                                autosave (debounce 400ms)
                                status = engine.checkStatus(state)
                                  └─ 'won' → detener timer · win-burst
                                             storage.recordResult(...)
                                             modal de victoria
```

---

## 7. El juego dummy es un test vivo

`/games/_dummy` **no se borra** al llegar el primer juego real. Es la implementación mínima del contrato completo, y su test verifica que el shell funciona con un módulo que no sabe nada de Sudoku ni de Buscaminas.

Cuando el contrato cambie, el dummy es lo primero que se actualiza. Si actualizarlo duele, el cambio de contrato está mal pensado.

---

## 8. Checklist para agregar un juego nuevo

- [ ] Carpeta en `/games/<id>/` con `engine/`, `view/`, `sprites/`
- [ ] `engine/` no importa React, ni CSS, ni `/design`
- [ ] `applyMove` puro: devuelve estado nuevo, no muta
- [ ] `serialize` → `deserialize` es round-trip exacto (test)
- [ ] `meta.difficulties` lista solo lo que realmente está implementado
- [ ] `export default` del `GameModule` en `index.ts`
- [ ] Una entrada en `REGISTRY` con `load: () => import(...)`
- [ ] La vista usa componentes de `/design`, no CSS propio salvo lo específico del tablero
- [ ] Probado a 360px, con teclado, y con `prefers-reduced-motion`
- [ ] **El diff no toca `/core`.** Si lo toca, justificar en el PR.
