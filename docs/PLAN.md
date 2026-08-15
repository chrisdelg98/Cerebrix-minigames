# 🗺️ Cerebrix — Plan de Construcción

> Documento vivo. Es la hoja de ruta oficial del proyecto.
> Complementos: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (los valores) · [`STYLING.md`](./STYLING.md) (dónde vive cada regla CSS) · [`GAME_CONTRACT.md`](./GAME_CONTRACT.md) (la interfaz técnica).

---

## 📌 Qué cambió respecto del plan original (y por qué)

El plan de partida era correcto en su tesis central: **el contrato primero, los juegos después**. Estos son los ajustes:

| #   | Cambio                                                                                                                       | Razón                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`render` sale de la interfaz del motor.** El contrato se parte en `engine` (lógica pura, sin React) + `View` (componente). | Si `render` vive en la misma interfaz que `validate`, el motor queda casado con el framework. Separados, la lógica se testea sin DOM, corre en un Web Worker y sobrevive a un cambio de UI. Es la mejora estructural más importante.                                          |
| 2   | **Los tokens de diseño se crean en Fase 1, no en Fase 2.**                                                                   | El shell necesita _algún_ color desde el minuto uno. Se crean los tokens (10 min de trabajo) y el shell los consume desde el principio; la Fase 2 construye los componentes y el estilo real sobre esa base ya conectada. Evita reescribir el shell entero.                   |
| 3   | **Persistencia con `schemaVersion` y migraciones desde el día 1.**                                                           | El original guarda estado sin versionar. La primera vez que cambies la forma del estado de Sudoku, todas las partidas guardadas de tus usuarios revientan. Un campo `schemaVersion` + una tabla de migraciones cuesta 20 líneas ahora y es imposible de retrofittear después. |
| 4   | **Autosave por evento, no por intervalo.** Se guarda con debounce tras cada jugada **y** en `visibilitychange`.              | En móvil el sistema mata la pestaña sin avisar. Un `setInterval` de 10s pierde las últimas jugadas; `visibilitychange` es el único evento confiable.                                                                                                                          |
| 5   | **Generación de Sudoku en Web Worker.**                                                                                      | El backtracking con verificación de unicidad puede tardar segundos en un móvil de gama media. En el hilo principal congela la UI y arruina el "super fluido".                                                                                                                 |
| 6   | **Fase 7 nueva: pulido, PWA y presupuesto de performance.**                                                                  | El plan original terminaba en "dos juegos corriendo". Falta el trabajo que hace que se sienta bien en el transporte: offline, instalable, y medición real de FPS en un dispositivo lento.                                                                                     |
| 7   | **Cada fase tiene criterios de aceptación verificables**, no solo un hito narrativo.                                         | "Hito: el shell carga cualquier plugin" es una intención. "El test `registry.test.ts` monta un módulo falso sin que `/core` lo importe" es una verificación.                                                                                                                  |
| 8   | **`/core` no importa de `/games` — con un lint que lo hace fallar.**                                                         | La regla del plan original es la correcta, pero una regla que no está automatizada se rompe a las tres semanas. Se enforcea con `eslint-plugin-boundaries` en CI.                                                                                                             |

---

## 🧱 Decisiones base (cerradas)

| Decisión             | Elección                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript (`strict`)                                                                                       |
| **Bundler**          | Vite 8                                                                                                                 |
| **Estado del shell** | Zustand (~1 kB). El estado _del juego_ vive en su engine, no acá.                                                      |
| **Estilos**          | CSS Modules + custom properties. Sin Tailwind: el design system se define en tokens y no quiero dos fuentes de verdad. |
| **Router**           | React Router v7 (`createBrowserRouter` + `lazy`)                                                                       |
| **Persistencia**     | IndexedDB vía `idb`, detrás de una interfaz propia                                                                     |
| **Tests**            | Vitest (lógica) + Testing Library (componentes) + Playwright (E2E, desde Fase 6)                                       |
| **Sprites**          | SVG inline animado con CSS (ver `DESIGN_SYSTEM.md` §6)                                                                 |
| **Backend**          | Ninguno en v1. La capa `/storage` deja la puerta abierta.                                                              |
| **Deploy**           | Sitio estático (Vercel / Netlify / GitHub Pages)                                                                       |

### Estructura de carpetas

```
cerebrix/
├── docs/                       # PLAN · DESIGN_SYSTEM · GAME_CONTRACT
├── public/
├── src/
│   ├── core/                   # ⛔ NUNCA importa de /games ni de /design/sprites de un juego
│   │   ├── contract.ts         # Tipos del contrato de juego
│   │   ├── registry.ts         # Manifiesto: id → () => import(...)
│   │   ├── difficulty.ts       # Escala 1–5 compartida
│   │   ├── router.tsx
│   │   ├── shell/              # AppShell, GameFrame, Home
│   │   └── hooks/              # useGameSession, useAutosave, usePrefetch
│   ├── design/                 # Tokens + componentes + animaciones + sprites comunes
│   │   ├── tokens/             # palette.css · theme.css · space.css · motion.css
│   │   ├── animations.css
│   │   ├── components/
│   │   └── sprites/
│   ├── storage/                # Interfaz + driver IndexedDB + migraciones
│   ├── games/
│   │   ├── _dummy/             # Juego de prueba del contrato (se conserva: es un test vivo)
│   │   ├── sudoku/
│   │   │   ├── index.ts        # export default: GameModule
│   │   │   ├── engine/         # Lógica pura. Cero imports de React.
│   │   │   ├── view/           # Componentes
│   │   │   ├── sprites/
│   │   │   ├── data/           # Puzzles pregenerados por dificultad
│   │   │   └── workers/        # generator.worker.ts
│   │   └── minesweeper/
│   └── main.tsx
└── tests/
```

**Reglas de frontera (enforcadas por ESLint, no por buena voluntad):**

1. `/games/<a>` **no** puede importar de `/games/<b>`.
2. `/core` **no** puede importar de `/games/*`. Solo conoce `registry.ts`, que contiene funciones `import()` perezosas.
3. `/games/*/engine` **no** puede importar de React ni de `/design`. Lógica pura y punto.
4. `/design` **no** importa de `/core` ni de `/games`. Es la capa más baja.

---

## Fase 0 — Andamiaje 🏗️

**Objetivo:** que `npm run dev` levante una página en blanco con todo el tooling puesto.

- [x] Vite 8 + React 19 + TypeScript
- [x] TypeScript en `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- [x] Alias de paths: `@core`, `@design`, `@games`, `@storage`
- [x] ESLint + Prettier + `eslint-plugin-boundaries` con las 4 reglas de frontera
- [x] Stylelint con las reglas de [`STYLING.md`](./STYLING.md) §8 (cero hex, cero `--raw-*`, cero `!important`)
- [x] Capas CSS `@layer tokens, base, components, game, overrides` declaradas
- [x] Vitest + Testing Library, con tests que verifican las reglas de frontera
- [x] Husky + lint-staged (lint + format en pre-commit)
- [x] GitHub Actions: audit → typecheck → lint → format → test → build
- [x] Endurecimiento de cadena de suministro: `ignore-scripts=true` en `.npmrc`, `npm ci --ignore-scripts` en CI, `npm audit --audit-level=high`, lockfile versionado
- [x] `.gitignore`, `README.md`, `docs/`

**✅ Aceptación — cumplida.** `tests/boundaries.test.ts` verifica que estos cinco imports ilegales rompen el lint:

| Import ilegal             | Regla                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `/core` → `@games/sudoku` | El registro es el único que nombra juegos, y con `import()` perezoso |
| juego A → juego B         | Los juegos no se conocen entre sí                                    |
| `engine/` → `react`       | El motor es lógica pura                                              |
| `engine/` → `@design/*`   | El motor no conoce la UI                                             |
| `/design` → `@core/*`     | `/design` es la capa más baja                                        |

> Durante esta fase la config de `boundaries` estuvo mal escrita **dos veces** y el lint pasó en verde igual. De ahí el test: una regla de arquitectura que nunca dispara es peor que no tenerla, porque da confianza falsa.
>
> Y el propio test cayó en la misma trampa una tercera vez: llamaba a `lintFiles()` una vez por caso, pero typescript-eslint construye el `Program` en la primera llamada y lo cachea, así que los fixtures escritos después no existían para el parser. El `Parsing error` resultante **reemplaza** el mensaje de la regla — los casos negativos fallaban y el caso positivo (`not.toMatch`) pasaba por el motivo equivocado. Ahora todos los fixtures se escriben antes del primer lint, se lintean en una sola pasada, y **cada caso asserta explícitamente que no hubo `Parsing error`**. Sin esa aserción, este modo de fallo puede volver a disfrazarse de verde.

**Estado del build:** bundle inicial **60.5 kB gzip** (presupuesto: 120 kB).

---

## Fase 1 — Contrato + shell vacío 📐

**Objetivo:** un esqueleto que carga juegos que no conoce.

- [x] `core/contract.ts` — tipos completos (ver [`GAME_CONTRACT.md`](./GAME_CONTRACT.md))
- [x] `core/registry.ts` — manifiesto con metadata + loader perezoso
- [x] Tokens mínimos de `design/tokens/` conectados (colores, espaciado, motion)
- [x] `AppShell`: header (timer + dificultad) / área central / footer de acciones
- [x] `Home`: grid de tarjetas leído **del registro**, nunca hardcodeado
- [x] Router con `lazy` + `Suspense` + un `<Skeleton>` de fallback
- [x] `games/_dummy/` — botón "Ganar", implementa el contrato completo

**✅ Aceptación — cumplida.** Verificada por tests, no por inspección:

| Criterio                                                     | Dónde se verifica                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Se juega el dummy desde Home                                 | `tests/shell.test.tsx` — navega, juega, deshace y gana en el router |
| `grep -r "games/" src/core/` devuelve **solo** `registry.ts` | `tests/architecture.test.ts` — escanea `/core` entero               |
| Un juego nuevo aparece en Home sin tocar ningún otro archivo | `tests/registry.test.tsx` — inyecta una entrada inventada           |
| `preview` del registro no se desincroniza del `meta` real    | `tests/registry.test.tsx` — compara contra el módulo cargado        |
| El motor se testea sin DOM ni renderer                       | `tests/dummyEngine.test.ts` — pureza, round-trip, rechazo, pista    |

### Decisiones que tomó esta fase

**`defineGame()` — el único cast del repo.** El shell guarda módulos cuyos tipos no puede nombrar. Borrarlos a `unknown` funciona para el motor (los métodos son bivariantes en sus parámetros) pero **no** para `View`: las props de un componente están en posición contravariante, así que ningún truco de varianza hace que `GameModule<SudokuState, …>` sea asignable a `GameModule<unknown, …>`. En vez de esparcir `any` por el shell, el borrado ocurre **una sola vez**, en `defineGame()`. Adentro de cada juego los tipos son completos y reales; afuera el shell es ciego a propósito.

**El estado de la sesión es derivado, no reseteado.** Al cambiar de dificultad o empezar de nuevo, la pila de deshacer, el rechazo y la pista no se limpian con `setState` dentro de un efecto — cada uno lleva la identidad de su ronda y se ignora si no coincide. Un `setState` sincrónico en un efecto encadena renders para nada, y el lint de React lo marca como error.

**El timer no re-renderiza el árbol.** Su tick vive en un `rAF` que escribe `textContent` y solo cuando el string cambia. Un `setState` por segundo volvería a renderizar el tablero entero por un dígito cosmético.

**Estado del build:** inicial **95.5 kB gzip** (91.7 JS + 3.7 CSS; presupuesto 120 kB) · chunk del dummy **1.9 kB gzip** (presupuesto 60 kB). La subida desde los 60.5 kB de la Fase 0 es React Router. El shell del juego (`GameRoute`) también está code-splitteado: quien solo mira Home no lo descarga.

---

## Fase 2 — Design system 🎨

**Objetivo:** que el dummy ya se vea "de la familia" y que un token repinte todo.

Referencia normativa completa: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

- [x] Tokens completos: color (dark + light), tipografía, espaciado, radios, sombras, motion
- [x] `animations.css` con el catálogo estándar (§5.3)
- [x] Componentes base: `Button`, `IconButton`, `Cell`, `Grid`, `Timer`, `Badge`, `DifficultyPicker`, `Modal`, `Toast`, `Skeleton`, `StatTile` — más `ProgressBar` y `EmptyState`
- [x] Secuencia de entrada animada de la Home (§5.4)
- [x] Sprites compartidos: `LogoCerebrix`, `Trophy`, `Streak`, `Clock`
- [x] Toggle de tema (dark/light) + script anti-FOUC en `<head>`
- [x] Toggle "Reducir animaciones" + soporte de `prefers-reduced-motion`
- [x] Layout responsive: barra de acciones fija abajo en móvil, `dvh`, `safe-area-inset`

**✅ Aceptación:**

| Criterio                                                  | Estado                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cambiar `--raw-violet-600` repinta acentos en toda la app | ✅ `tests/tokens.test.ts` verifica que la cadena token → paleta no esté cortada                                                            |
| Ruta que muestra todos los componentes en sus estados     | ✅ `/kitchen-sink`, lazy — `tests/design.test.tsx` la monta entera                                                                         |
| Nada se rompe con las animaciones desactivadas            | ✅ Ambos canales (OS y toggle propio) verificados en test; todo estado final es correcto sin animación                                     |
| Nada se rompe a 360px de ancho                            | ⚠️ **Sin verificar visualmente.** El CSS es mobile-first con `dvh` y `safe-area-inset`, pero falta una mirada real en un viewport de 360px |

> `press` y `lift` del catálogo (§5.3) no son `@keyframes`: son transiciones de `:active` y `:hover` en `Button`, `IconButton` y `Cell`. Un keyframe para un estado que el navegador ya mantiene sería peor — se pelearía con el estado real del elemento.

### Decisiones que tomó esta fase

**`<Modal>` sobre `<dialog>` nativo.** La trampa de foco, `Esc`, la inercia de la página de atrás y el top layer los da la plataforma. Un modal hecho a mano se equivoca en al menos uno de esos cuatro. El costo: jsdom 30 no implementa **ningún** método de `<dialog>`, así que `tests/setup.ts` los stubea. Consecuencia honesta: los tests cubren abrir, cerrar y que todo cierre pase por un solo handler — **`Esc`, la trampa de foco y la inercia no están cubiertas** y quedan para la auditoría de teclado de la Fase 7.

**El desenlace se anuncia una sola vez.** Al terminar la partida, el estado no se repite en la región `aria-live`: el nombre accesible del modal ya lo anuncia al abrirse. Tenerlo en los dos lados hacía que un lector de pantalla leyera la victoria dos veces.

**`<Cell>` con `memo` obligatorio.** Un tablero experto de Buscaminas son ~480 celdas; sin `memo` cada jugada re-renderiza las 480. El área táctil de 44px la agrega un pseudo-elemento centrado, no padding: el padding deformaría la geometría del grid.

**`<Grid>` no asume tablero cuadrado.** `rows` puede diferir de `cols` desde el día uno — es justo el supuesto que la Fase 6 existe para romper, y romperlo ahora cuesta una línea.

**La secuencia de entrada corre una vez por sesión** (`sessionStorage`). Volver a Home desde un juego usa `view-in`. Una animación que ya viste es latencia.

**Estado del build:** inicial **97.5 kB gzip** (93.2 JS + 4.3 CSS; presupuesto 120 kB). `KitchenSink` y `GameRoute` van en chunks aparte.

---

## Fase 3 — Persistencia 💾

**Objetivo:** cerrar la pestaña y volver exactamente donde estabas.

```ts
interface StorageDriver {
  saveSession(gameId: string, session: SavedSession): Promise<void>;
  loadSession(gameId: string): Promise<SavedSession | null>;
  clearSession(gameId: string): Promise<void>;
  recordResult(gameId: string, result: GameResult): Promise<void>;
  getStats(gameId: string): Promise<GameStats>;
  getGlobalStats(): Promise<GlobalStats>;
  exportAll(): Promise<string>; // JSON — backup del usuario
  importAll(json: string): Promise<void>;
}
```

- [ ] Interfaz + driver IndexedDB (`idb`), con fallback a `localStorage`
- [ ] `schemaVersion` en cada registro + tabla de migraciones
- [ ] `useAutosave`: debounce 400ms tras cada jugada + flush en `visibilitychange` y `pagehide`
- [ ] Estadísticas: partidas, completadas, % éxito, tiempo total, mejor tiempo **por dificultad**, racha actual, racha máxima
- [ ] "Continuar partida" en la tarjeta de Home cuando hay sesión guardada
- [ ] Exportar/importar como archivo JSON

**✅ Aceptación:**

- Jugás el dummy, matás la pestaña desde el administrador de tareas, reabrís → estado exacto, timer incluido.
- Un test carga un registro con `schemaVersion: 1` y lo migra a la versión actual sin pérdida.

---

## Fase 4 — Dificultad unificada 🎚️

**Objetivo:** un selector idéntico en todos los juegos; cada juego decide qué significa.

```ts
type Difficulty = 1 | 2 | 3 | 4 | 5;
// 1 Fácil · 2 Casual · 3 Normal · 4 Difícil · 5 Experto
```

- [ ] `core/difficulty.ts`: escala, etiquetas, colores por nivel (tokens)
- [ ] `getDifficultyConfig(d)` en cada engine → su configuración interna
- [ ] `<DifficultyPicker>` conectado al registro: solo muestra las dificultades que el juego declara en su metadata
- [ ] La dificultad elegida persiste **por juego**
- [ ] Cambiar dificultad a mitad de partida pide confirmación

**✅ Aceptación:** el dummy declara soportar `[1,3,5]` y el picker muestra exactamente esos tres, sin código específico del dummy en el shell.

---

## Fase 5 — Sudoku 🔢

**Objetivo:** el primer juego real, cumpliendo el contrato sin modificarlo.

**5a — Jugable con puzzles pregenerados**

- [ ] `data/puzzles-{1..5}.json` (≥ 50 por dificultad), importados dinámicamente
- [ ] Engine puro: `createInitialState`, `applyMove`, `validate`, `checkWin`, `serialize`, `deserialize`
- [ ] Vista: grid 9×9 con líneas de bloque, selección, resaltado de pares (fila/columna/caja), resaltado del mismo número
- [ ] Teclado numérico táctil + soporte de teclado físico + flechas
- [ ] Modo lápiz (anotaciones), deshacer/rehacer, borrar
- [ ] Detección de conflictos con `shake` + `--c-cell-error`
- [ ] Victoria: `win-burst` + guardado de resultado

**5b — Generador propio**

- [ ] Backtracking con orden aleatorio + poda por unicidad de solución
- [ ] Calibración de dificultad por técnicas requeridas (naked single, hidden single, pointing pair…), no solo por celdas vacías
- [ ] Corre en `generator.worker.ts`; la UI muestra progreso y **nunca** se congela
- [ ] Pre-generación de la siguiente partida en idle (`requestIdleCallback`)

**✅ Aceptación:**

- Sudoku jugable, guardable, con dificultad, dentro del shell — **con cero cambios en `/core`** (verificable en el diff).
- Tests del engine: unicidad de solución, detección de conflictos, round-trip de serialización.
- 60fps al navegar el tablero con throttling 4× en un móvil emulado.

---

## Fase 6 — Buscaminas: la prueba de fuego 💣

**Objetivo:** validar que la arquitectura aguanta un juego de naturaleza distinta.

Buscaminas antes que Solitario a propósito: comparte el modelo de grid (reusa `<Cell>` y `<Grid>`) pero rompe supuestos que Sudoku no rompía — tablero no cuadrado, estado oculto, condición de derrota, interacción secundaria (bandera).

- [ ] Engine: generación con primer click seguro, flood fill, conteo de vecinos
- [ ] Vista: long-press = bandera en móvil, click derecho en desktop, chording
- [ ] Cascada de revelado con `reveal-wave` (delay por distancia, topeado)
- [ ] Sprites `Mine` y `Flag` animados
- [ ] Contador de minas restantes

**✅ Aceptación (la que importa):**

- Si entró **sin tocar `/core`** → la arquitectura sirve, se sigue.
- Si hubo que tocar `/core` → **se para y se refactoriza el contrato ahora**. Con dos juegos cuesta una tarde; con cinco, una semana. Documentar qué supuesto falló.

---

## Fase 7 — Pulido, offline y performance ⚡

**Objetivo:** que sirva de verdad en el subte, sin señal y con una mano.

- [ ] PWA: manifest, íconos, service worker (Workbox), instalable
- [ ] Offline completo — no hay backend, no hay excusa
- [ ] Vista de estadísticas y logros (lazy)
- [ ] Presupuestos verificados en CI: bundle inicial ≤ 120 kB gzip, cada juego ≤ 60 kB
- [ ] Lighthouse móvil ≥ 90 en Performance y Accessibility
- [ ] Profiling real con throttling 4×: sin frames largos al navegar el tablero
- [ ] Auditoría de teclado y lector de pantalla
- [ ] E2E con Playwright: jugar y ganar cada juego, recargar y resumir

---

## 🎯 Orden mental

```
Andamiaje → Contrato → Shell → Design → Storage → Dificultad → Sudoku → Buscaminas → Pulido
└────────── el esqueleto que funciona vacío ──────────┘ └──── lo llenás con juegos ────┘
```

Las fases 0–4 se sienten como "no estoy haciendo un juego" y dan ansiedad. Ese es exactamente el trabajo que hace que el juego 3, 4 y 5 tomen días en vez de semanas.

**No te saltees al Sudoku antes de tener el contrato.**

---

## 🔮 Backlog (post-v1, no distraerse)

- Solitario, 2048, Nonograma, Sopa de letras
- Puzzle diario con semilla compartida
- Sincronización en la nube (la interfaz de `/storage` ya lo permite)
- Logros y niveles de perfil
- Temas alternativos (el design system ya lo soporta: es cambiar una capa de tokens)
